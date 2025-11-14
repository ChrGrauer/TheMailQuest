// Quick check script to test reputation storage
const destinations = ['Gmail', 'Outlook', 'Yahoo'];
const reputation = {};

for (const destName of destinations) {
	reputation[destName] = 70;
}

console.log('Stored reputation:', reputation);
console.log('Gmail:', reputation['Gmail']);
console.log('Outlook:', reputation['Outlook']);
console.log('Yahoo:', reputation['Yahoo']);
console.log('gmail (lowercase):', reputation['gmail']);
