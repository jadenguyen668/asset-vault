const fs = require('fs');

const a = JSON.parse(fs.readFileSync('tmp_debug/Cay kim tien.json'));
const b = JSON.parse(fs.readFileSync('tmp_debug/output_3.8.json'));

let aFrames = 0;
let bFrames = 0;

for(const k in a.animations) {
    for(const l in a.animations[k].bones) {
        if(a.animations[k].bones[l].rotate) aFrames += a.animations[k].bones[l].rotate.length || 0;
    }
}
for(const k in b.animations) {
    for(const l in b.animations[k].bones) {
        if(b.animations[k].bones[l].rotate) bFrames += b.animations[k].bones[l].rotate.length || 0;
    }
}

console.log('A rotates:', aFrames, '-- B rotates:', bFrames);

// Check if blending is same
const aBlend = a.slots.filter(s => s.blend).map(s=>s.blend);
const bBlend = b.slots.filter(s => s.blend).map(s=>s.blend);
const isBlendSame = JSON.stringify(aBlend) === JSON.stringify(bBlend);
console.log('Is blending same:', isBlendSame);

if (!isBlendSame) {
    console.log('A blend:', aBlend.length, 'B blend:', bBlend.length);
}

const keysA = Object.keys(a);
const keysB = Object.keys(b);
console.log('Keys missing in B:', keysA.filter(k => !keysB.includes(k)));
console.log('Keys missing in A:', keysB.filter(k => !keysA.includes(k)));

// check physics 
console.log('A physics:', !!a.physics);
console.log('B physics:', !!b.physics);

