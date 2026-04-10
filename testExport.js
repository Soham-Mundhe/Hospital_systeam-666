const { exportCheckInsToCSV } = require('./src/utils/exportCheckInsToCSV.ts');

const records = [
    {
        id: '123',
        patient_id: 'P-123',
        name: 'John Doe',
        age: 30,
        gender: 'Male',
        disease: 'Fever',
        visit_date: '2023-10-10',
        photos: ['http://example.com/photo.jpg'],
        documents: [{ url: 'http://example.com/doc.pdf', name: 'doc.pdf' }]
    }
];

try {
    // We hack the DOM to test this
    global.window = {};
    global.document = {
        createElement: (tag) => ({
            setAttribute: () => {},
            style: {},
            click: () => { console.log('Clicked download'); }
        }),
        body: {
            appendChild: () => {},
            removeChild: () => {}
        }
    };
    global.Blob = class {
        constructor(content, options) {
            this.content = content;
            this.options = options;
        }
    };
    global.URL = {
        createObjectURL: () => 'blob:http://localhost/123'
    };

    exportCheckInsToCSV(records);
    console.log("SUCCESS");
} catch (e) {
    console.error("ERROR", e);
}
