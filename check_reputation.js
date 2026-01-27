// Quick check script to test reputation storage
const destinations = ['zmail', 'intake', 'yagle'];
const reputation = {};

for (const destName of destinations) {
	reputation[destName] = 70;
}

console.log('Stored reputation:', reputation);
console.log('zmail:', reputation['zmail']);
console.log('intake:', reputation['intake']);
console.log('yagle:', reputation['yagle']);
console.log('zmail (lowercase):', reputation['zmail']);
