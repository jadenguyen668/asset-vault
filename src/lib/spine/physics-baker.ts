/**
 * Bakes physics simulations into standard keyframes so they can be exported to older Spine versions.
 * Only strips features that are truly unsupported in the target version.
 * 
 * Feature support matrix:
 * - Physics: 4.2+ only
 * - Clipping: 3.6+ (DO NOT strip for 3.8!)
 * - Sequence: 4.0+ only
 */
export async function bakePhysics(
    jsonText: string,
    targetMajor: number = 3,
    targetMinor: number = 8,
    targetFps: number = 30
): Promise<string> {
    const rawJson = JSON.parse(jsonText);
    
    const hasPhysics = rawJson.physics && rawJson.physics.length > 0;
    
    if (!hasPhysics) {
        return stripUnsupportedFeatures(rawJson, targetMajor, targetMinor);
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
        let totalBakedBones = 0;
        let totalBakedAnims = 0;

        for (const anim of skeletonData.animations) {
            const animName = anim.name;
            skeleton.setToSetupPose();
            animationState.clearTracks();
            
            // Pre-warm physics: let constraints settle at setup pose
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

            const framesData: Record<string, { rotate: any[], translate: any[] }> = {};
            
            // Determine bones affected by physics
            for (const pConstraint of skeletonData.physicsConstraints) {
                const bName = pConstraint.bone.name;
                framesData[bName] = { rotate: [], translate: [] };
            }

            if (Object.keys(framesData).length === 0) continue;

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
                    
                    let rot = bone.rotation;
                    let tx = bone.x;
                    let ty = bone.y;
                    
                    // Normalize rotation
                    while (rot > 180) rot -= 360;
                    while (rot < -180) rot += 360;

                    const fmt = (n: number) => Number(n.toFixed(3));
                    const t = fmt(simulatedTime);
                    framesData[bName].rotate.push({ time: t, angle: fmt(rot) });
                    framesData[bName].translate.push({ time: t, x: fmt(tx), y: fmt(ty) });
                }
            }

            for (const bName in framesData) {
                if (!rawBonesAnim[bName]) rawBonesAnim[bName] = {};
                
                // Always write baked keyframes for physics bones (override any existing)
                rawBonesAnim[bName].rotate = framesData[bName].rotate;
                rawBonesAnim[bName].translate = framesData[bName].translate;
                totalBakedBones++;
            }
            totalBakedAnims++;
        }

        console.log(`[BAKE PHYSICS] Baked ${totalBakedBones} bone tracks across ${totalBakedAnims} animations at ${targetFps}fps`);
        return stripUnsupportedFeatures(rawJson, targetMajor, targetMinor);

    } catch (e: any) {
        console.error("[BAKE PHYSICS] Failed to bake physics, stripping only:", e?.message, e?.stack);
        return stripUnsupportedFeatures(rawJson, targetMajor, targetMinor);
    }
}

/**
 * Strips features not supported in the target Spine version.
 * Respects the feature support matrix:
 * - Physics: only in 4.2+ → always strip for lower
 * - Clipping: supported since 3.6 → keep for 3.6+
 * - Sequence: only in 4.0+ → strip for lower
 */
function stripUnsupportedFeatures(rawJson: any, targetMajor: number, targetMinor: number): string {
    const targetSupportsClipping = targetMajor > 3 || (targetMajor === 3 && targetMinor >= 6);
    const targetSupportsSequence = targetMajor > 4 || (targetMajor === 4 && targetMinor >= 0);

    // 1. Always remove physics (only 4.2+ supports it)
    if (rawJson.physics) {
        console.log(`[STRIP] Removing physics section (${rawJson.physics.length} constraints)`);
        delete rawJson.physics;
    }

    // 2. Remove physics timelines from animations
    if (rawJson.animations) {
        for (const animName in rawJson.animations) {
            const anim = rawJson.animations[animName];
            if (anim.physics) delete anim.physics;
        }
    }

    // 3. Only strip clipping and sequence if target doesn't support them
    if (rawJson.skins) {
        const skinsArray = Array.isArray(rawJson.skins) ? rawJson.skins : Object.values(rawJson.skins);
        
        for (const skin of skinsArray) {
            const attachments = (skin as any).attachments || {};
            
            for (const slotKey in attachments) {
                const slotMap = attachments[slotKey];
                
                for (const attName in slotMap) {
                    const att = slotMap[attName];
                    
                    // Only strip clipping if target doesn't support it (< 3.6)
                    if (att.type === 'clipping' && !targetSupportsClipping) {
                        console.log(`[STRIP] Removing clipping attachment: ${attName} (target ${targetMajor}.${targetMinor} < 3.6)`);
                        delete slotMap[attName];
                    }
                    
                    // Only strip sequence if target doesn't support it (< 4.0)  
                    if (att.sequence && !targetSupportsSequence) {
                        console.log(`[STRIP] Removing sequence from: ${attName}`);
                        delete att.sequence;
                    }
                }
            }
        }
    }

    return JSON.stringify(rawJson);
}
