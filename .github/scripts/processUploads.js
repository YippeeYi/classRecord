const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const DATA_DIR = path.join(__dirname, '../../data');
const IMAGES_DIR = path.join(__dirname, '../../images');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

const uploadedFiles = fs.readdirSync(UPLOAD_DIR);
const jsonFiles = uploadedFiles.filter(f => f.endsWith('.json'));
const imageFiles = uploadedFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

let existingRecords = [];
const existingDataFiles = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [];
existingDataFiles.forEach(file => {
    if (file.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file)));
        existingRecords.push(data);
    }
});

jsonFiles.forEach(jsonFile => {
    const jsonPath = path.join(UPLOAD_DIR, jsonFile);
    const record = JSON.parse(fs.readFileSync(jsonPath));

    const sameDayRecords = existingRecords.filter(r => r.date === record.date);
    const order = sameDayRecords.length + 1;

    const uploadedImageName = imageFiles.find(f => f.startsWith(path.parse(jsonFile).name));
    if (!uploadedImageName) { console.error(`未找到对应图片: ${jsonFile}`); return; }

    const ext = path.extname(uploadedImageName).toLowerCase();
    const imageName = `${record.date}-${String(order).padStart(2, '0')}${ext}`;
    record.order = order;
    record.image = `images/${imageName}`;

    const dataFilePath = path.join(DATA_DIR, `${record.date}-${String(order).padStart(2, '0')}.json`);
    fs.writeFileSync(dataFilePath, JSON.stringify(record, null, 2));

    const srcImagePath = path.join(UPLOAD_DIR, uploadedImageName);
    const destImagePath = path.join(IMAGES_DIR, imageName);
    fs.renameSync(srcImagePath, destImagePath);

    existingRecords.push(record);
    fs.unlinkSync(jsonPath);

    console.log(`处理完成: ${dataFilePath} 与 ${imageName}`);
});

console.log("所有上传文件处理完成。");
