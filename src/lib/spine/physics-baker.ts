/**
 * Bakes physics simulations into standard keyframes so they can be exported to older Spine versions.
 * Also strips unsupported features (clipping, sequence) for lower versions.
 */
export async function bakePhysics(jsonText: string, targetFps: number = 30): Promise<string> {
    const rawJson = JSON.parse(jsonText);
    
    // 1. Feature checks: if no physics, just strip and return
    if (!rawJson.physics || rawJson.physics.length === 0) {
        return stripUnsupportedFeatures(rawJson);
    }

    try {
        // Dynamic import to avoid Next.js bundling issues with spine-core on server
        const spine = await import('@esotericsoftware/spine-core');

        // DummyAttachmentLoader: no textures needed for headless physics simulation
        const loader: any = {
            newRegionAttachment(_skin: any, name: string, path: string) {
                const att = new spine.RegionAttachment(name, path);
                try { (att as any).region = {} as any; } catch(e) {}
                return att;
            },
            newMeshAttachment(_skin: any, name: string, path: string) {
                const att = new spine.MeshAttachment(name, path);
                try { (att as any).region = {} as any; } catch(e) {}
                return att;
            },
            newBoundingBoxAttachment(_skin: any, name: string) {
                return new spine.BoundingBoxAttachment(name);
            },
            newPathAttachment(_skin: any, name: string) {
                return new spine.PathAttachment(name);
            },
            newPointAttachment(_skin: any, name: string) {
                return new spine.PointAttachment(name);
            },
            newClippingAttachment(_skin: any, name: string) {
                return new spine.ClippingAttachment(name);
            },
        };

        const skeletonJson = new spine.SkeletonJson(loader);
        const skeletonData = skeletonJson.readSkeletonData(rawJson);
        
        const skeleton = new spine.Skeleton(skeletonData);
        const animationStateData = new spine.AnimationStateData(skeletonData);
        animationStateData.defaultMix = 0; 
        const animationState = new spine.AnimationState(animationStateData);

        const stepTime = 1 / targetFps;

        for (const anim of skeletonData.animations) {
            const animName = anim.name;
            skeleton.setToSetupPose();
            animationState.clearTracks();
            
            // Pre-warm physics
            for (let i = 0; i < 30; i++) {
                skeleton.update(0.033);
                skeleton.updateWorldTransform(spine.Physics.update);
            }

            // Start animation
            animationState.setAnimation(0, animName, false);
            animationState.update(0);
            animationState.apply(skeleton);
            skeleton.updateWorldTransform(spine.Physics.update);
            
            if (!rawJson.animations[animName]) continue;
            if (!rawJson.animations[animName].bones) {
                rawJson.animations[animName].bones = {};
            }
            const rawBonesAnim = rawJson.animations[animName].bones;

            const duration = anim.duration;
            const framesCount = Math.max(1, Math.ceil(duration / stepTime));

            const framesData: Record<string, { rotate: any[], translate: any[], scale: any[], shear: any[] }> = {};
            
            // Determine bones affected by physics
            for (const pConstraint of skeletonData.physicsConstraints) {
                const bName = pConstraint.bone.name;
                framesData[bName] = { rotate: [], translate: [], scale: [], shear: [] };
            }

            let simulatedTime = 0;
            
            for (let frameIdx = 0; frameIdx <= framesCount; frameIdx++) {
                if (frameIdx > 0) {
                    skeleton.update(stepTime);
                    animationState.update(stepTime);
                    animationState.apply(skeleton);
                    skeleton.updateWorldTransform(spine.Physics.update);
                    simulatedTime += stepTime;
                }

                for (const pConstraint of skeletonData.physicsConstraints) {
                    const bone = skeleton.bones[pConstraint.bone.index];
                    const bName = bone.data.name;
                    
                    let rot = bone.rotation - bone.data.rotation;
                    let tx = bone.x - bone.data.x;
                    let ty = bone.y - bone.data.y;
                    let sx = bone.scaleX / bone.data.scaleX;
                    let sy = bone.scaleY / bone.data.scaleY;
                    let shx = bone.shearX - bone.data.shearX;
                    let shy = bone.shearY - bone.data.shearY;
                    
                    while (rot > 180) rot -= 360;
                    while (rot < -180) rot += 360;

                    const fmt = (n: number) => Number(n.toFixed(3));
                    const t = fmt(simulatedTime);
                    framesData[bName].rotate.push({ time: t, angle: fmt(rot) });
                    framesData[bName].translate.push({ time: t, x: fmt(tx), y: fmt(ty) });
                    framesData[bName].scale.push({ time: t, x: fmt(sx), y: fmt(sy) });
                    framesData[bName].shear.push({ time: t, x: fmt(shx), y: fmt(shy) });
                }
            }

            const hasVariance = (arr: any[], k1: string, k2?: string) => {
                if (arr.length <= 1) return false;
                const base = arr[0];
                for (let i = 1; i < arr.length; i++) {
                    if (arr[i][k1] !== base[k1]) return true;
                    if (k2 && arr[i][k2] !== base[k2]) return true;
                }
                if (k1 === 'angle' && base.angle !== 0) return true;
                if (k1 === 'x' && k2 === 'y' && (base.x !== 0 || base.y !== 0)) return true;
                return false;
            };

            for (const bName in framesData) {
                if (!rawBonesAnim[bName]) rawBonesAnim[bName] = {};
                
                if (hasVariance(framesData[bName].rotate, 'angle')) {
                    rawBonesAnim[bName].rotate = framesData[bName].rotate;
                }
                if (hasVariance(framesData[bName].translate, 'x', 'y')) {
                    rawBonesAnim[bName].translate = framesData[bName].translate;
                }
                if (hasVariance(framesData[bName].scale, 'x', 'y')) {
                    if (framesData[bName].scale.some((s: any) => s.x !== 1 || s.y !== 1)) {
                        rawBonesAnim[bName].scale = framesData[bName].scale;
                    }
                }
                if (hasVariance(framesData[bName].shear, 'x', 'y')) {
                    rawBonesAnim[bName].shear = framesData[bName].shear;
                }
            }
        }

        return stripUnsupportedFeatures(rawJson);

    } catch (e: any) {
        console.error("[BAKE PHYSICS] Failed to bake, stripping only:", e?.message);
        return stripUnsupportedFeatures(rawJson);
    }
}

/**
 * Strips features not supported in Spine 3.8 (e.g. sequence, clipping, physics)
 */
function stripUnsupportedFeatures(rawJson: any): string {
    // 1. Remove physics
    if (rawJson.physics) {
        delete rawJson.physics;
    }

    // 2. Remove physics timelines from animations
    if (rawJson.animations) {
        for (const animName in rawJson.animations) {
            const anim = rawJson.animations[animName];
            if (anim.physics) delete anim.physics;
        }
    }

    // 3. Remove clipping and sequences from skins
    if (rawJson.skins) {
        const skinsArray = Array.isArray(rawJson.skins) ? rawJson.skins : Object.values(rawJson.skins);
        
        for (const skin of skinsArray) {
            const attachments = (skin as any).attachments || {};
            
            for (const slotKey in attachments) {
                const slotMap = attachments[slotKey];
                
                for (const attName in slotMap) {
                    const att = slotMap[attName];
                    
                    if (att.type === 'clipping') {
                        delete slotMap[attName];
                    } else if (att.sequence) {
                        delete att.sequence;
                    }
                }
            }
        }
    }

    return JSON.stringify(rawJson);
}
