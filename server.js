const express = require("express");
const app = express();
const port = 3001;
require("dotenv").config();
const Minio = require("minio");
const fileUpload = require("express-fileupload");

app.use(fileUpload());
app.use(express.json());

const {
  ensureBucketExists,
  uploadFileToMinio,
  getPreviewUrl,
  getListObjects,
  deleteObject,
} = require("./services/minio.service");

app.post("/upload", async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).send({
        status: false,
        message: "No file uploaded",
      });
    } else {
      const uploadedFile = req.files.file;
 
      const customPath = req.body?.path ?? "";  
      const bucketName = process.env.MINIO_BUCKET;
      const path = customPath + "/" + Date.now() + "-" + uploadedFile.name;
      const fileBuffer = uploadedFile.data;

      const uploadedFilePath = await uploadFileToMinio(
        bucketName,
        path,
        fileBuffer
      );

      return res.status(200).send({
        message: "File is uploaded and stored in Minio",
        bucketName,
        path: uploadedFilePath,
        url: `https://${process.env.MINIO_HOST}/${bucketName}/${uploadedFilePath}`,
      });
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.post("/preview-url", async (req, res) => {
  try {
    const bucketName = process.env.MINIO_BUCKET;
    const path = req.body.path;
    const expiry = req.body.expiry;

    if (!path || !expiry) {
      return res.status(400).send({
        status: false,
        message: "No path/expiry provided",
      });
    }

    const previewUrl = await getPreviewUrl(bucketName, path, expiry);

    return res.status(200).send({
      previewUrl,
      expiry,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

app.delete("/delete", async (req, res) => {
  try {
    const bucketName = process.env.MINIO_BUCKET;
    const path = req.body.path;

    if (!path) {
      return res.status(400).send({
        status: false,
        message: "No path provided",
      });
    }

    const result = await deleteObject(bucketName, path);

    return res.status(200).send({
      message: result.message,
    });
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
