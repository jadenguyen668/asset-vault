const fs = require('fs');
const f = fs.readFileSync('d:/Dev/live_asset/tmp_debug/output_3.8.json', 'utf8');
const j = JSON.parse(f);

console.log('=== SPINE CONVERT DEBUG ===');
console.log('Version:', j.skeleton.spine);
console.log('Bones:', j.bones?.length);
console.log('Slots:', j.slots?.length);
console.log('Animations:', Object.keys(j.animations || {}).length);

console.log('\n--- Constraints ---');
console.log('Has IK:', !!j.ik, j.ik?.length || 0);
console.log('Has Transform:', !!j.transform, j.transform?.length || 0);
console.log('Has Path:', !!j.path, j.path?.length || 0);

if (j.ik) {
    j.ik.forEach(c => console.log('  IK:', c.name, 'order:', c.order));
}
if (j.transform) {
    j.transform.forEach(c => console.log('  Transform:', c.name, 'order:', c.order));
}
if (j.path) {
    j.path.forEach(c => console.log('  Path:', c.name, 'order:', c.order));
}

// Check for fields that might not exist in 3.8
console.log('\n--- Potentially incompatible fields ---');
console.log('Has physics:', !!j.physics);
console.log('Has sequence:', !!j.sequence);
const firstBone = j.bones?.[0];
if (firstBone) {
    console.log('First bone keys:', Object.keys(firstBone).join(', '));
}
