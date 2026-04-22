import * as spine from '@esotericsoftware/spine-core';
import fs from 'fs';

class DummyAttachmentLoader implements spine.AttachmentLoader {
    newRegionAttachment(skin: spine.Skin, name: string, path: string): spine.RegionAttachment {
        const att = new spine.RegionAttachment(name, path);
        att.region = {} as any;
        return att;
    }
    newMeshAttachment(skin: spine.Skin, name: string, path: string): spine.MeshAttachment {
        const att = new spine.MeshAttachment(name, path);
        att.region = {} as any;
        return att;
    }
    newBoundingBoxAttachment(skin: spine.Skin, name: string): spine.BoundingBoxAttachment {
        return new spine.BoundingBoxAttachment(name);
    }
    newPathAttachment(skin: spine.Skin, name: string): spine.PathAttachment {
        return new spine.PathAttachment(name);
    }
    newPointAttachment(skin: spine.Skin, name: string): spine.PointAttachment {
        return new spine.PointAttachment(name);
    }
    newClippingAttachment(skin: spine.Skin, name: string): spine.ClippingAttachment {
        return new spine.ClippingAttachment(name);
    }
}

try {
    const jsonText = fs.readFileSync('live_asset/package.json', 'utf-8'); // we will test this later
    console.log("Mock loader ready");
} catch(e: any) {
    console.log(e.message);
}
