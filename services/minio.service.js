const Minio = require('minio');
const { promisify } = require('util');

// docs = https://min.io/docs/minio/linux/developers/javascript/API.html

const s3Client = new Minio.Client({
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    endPoint: process.env.MINIO_HOST,
    useSSL: Boolean(process.env.MINIO_USE_SSL),
  });

const ensureBucketExists = async (bucketName) => {
    try {
        const exists = await s3Client.bucketExists(bucketName);
        if (!exists) {
            await s3Client.makeBucket(bucketName);
        }
    } catch (err) {
        if (err.code === 'NoSuchBucket') {
            await s3Client.makeBucket(bucketName);
        } else {
            throw err;
        }
    }
};

const uploadFileToMinio = async (bucketName, path, fileBuffer) => {

    await ensureBucketExists(bucketName);

    return new Promise((resolve, reject) => {
        s3Client.putObject(bucketName, path, fileBuffer, function (err, etag) {
            if (err) {
                return reject(err);
            }
           resolve(path);
        });
    });
};

const getPreviewUrl = async (bucketName, path, expiry = 3600) => {
    return new Promise((resolve, reject) => {
        s3Client.presignedUrl('GET', bucketName, path, Number(expiry), function (err, url) {
            if (err) {
                return reject(err);
            }
            resolve(url);
        });
    });
};

const getListObjects = async (bucketName, prefix = '') => {
    return new Promise((resolve, reject) => {
        const objectsList = [];
        const stream = s3Client.listObjectsV2(bucketName, prefix, true);
        stream.on('data', obj => {
            const objectPath = obj.name;
            const objectName = objectPath.replace(prefix, ''); // Extract object name without prefix

            // Check if the object is not a directory (does not end with a slash '/')
            if (!objectPath.endsWith('/')) {
                objectsList.push({
                    name: objectName,
                    isDirectory: false
                });
            }
        });
        stream.on('end', () => {
            resolve(objectsList);
        });
        stream.on('error', err => {
            reject(err);
        });
    });
};

const deleteObject = async (bucketName, path) => {
    const removeObjectAsync = promisify(s3Client.removeObject.bind(s3Client));
    try {
        await removeObjectAsync(bucketName, path);
        return { message: 'Object deleted successfully' };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    ensureBucketExists,
    uploadFileToMinio,
    getPreviewUrl,
    getListObjects,
    deleteObject,
    //copy
};
