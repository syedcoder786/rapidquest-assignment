const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase Admin Setup
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lsoys-assignment.appspot.com",
});
const bucket = admin.storage().bucket();

// // MongoDB Setup
// mongoose.connect("mongodb://localhost:27017/emailTemplates", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// Mongoose Model
const EmailTemplate = mongoose.model("EmailTemplate", {
  template: [
    {
      id: Number,
      html: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

app.get("/getEmailLayout", (req, res) => {
  //   const filePath = path.join(__dirname, "layout.html");
  //   res.sendFile(filePath);
  res.json([
    {
      html: '<p class="ql-align-center"><strong class="ql-size-huge">Email has never been easier</strong></p>',
      id: 1,
    },
    {
      html: '<p><strong style="background-color: rgb(255, 255, 255);">Lorem Ipsum</strong><span style="background-color: rgb(255, 255, 255);">&nbsp;is simply&nbsp;</span><em style="background-color: rgb(255, 255, 255);">dummy text</em><span style="background-color: rgb(255, 255, 255);">&nbsp;of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type&nbsp;</span><u style="background-color: rgb(255, 255, 255);">specimen book</u><span style="background-color: rgb(255, 255, 255);">. It has survived not only&nbsp;</span><span style="color: rgb(153, 51, 255); background-color: rgb(255, 255, 255);">five centuries</span><span style="background-color: rgb(255, 255, 255);">, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the&nbsp;</span><span style="background-color: rgb(255, 255, 0);">1960s</span><span style="background-color: rgb(255, 255, 255);">&nbsp;with the release of&nbsp;</span><a href="about:blank" rel="noopener noreferrer" target="_blank" style="background-color: rgb(255, 255, 255); color: rgb(12, 12, 232);">Letraset sheets</a><span style="background-color: rgb(255, 255, 255);">&nbsp;containing.&nbsp;</span></p>',
      id: 2,
    },
    {
      html: '<p class="ql-align-center"><u style="color: rgb(92, 0, 0);">Contains image upload with firebase﻿</u></p><p><img src="https://storage.googleapis.com/lsoys-assignment.appspot.com/rapidquestimages/1737299085303_hacker.jpg" alt="Uploaded Image"></p>',
      id: 3,
    },
  ]);
});

const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// API to handle image upload
app.post("/uploadImage", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    const file = req.file;
    const fileName = `${Date.now()}_${file.originalname}`;
    const fileBuffer = file.buffer;

    const fileUpload = bucket.file(`rapidquestimages/${fileName}`);
    await fileUpload.save(fileBuffer, {
      contentType: file.mimetype,
      public: true,
    });

    const fileUrl = `https://storage.googleapis.com/${bucket.name}/rapidquestimages/${fileName}`;

    // Respond with the image URL
    res.status(200).json({ imageUrl: fileUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).send({ message: "Error uploading image" });
  }
});

// Upload Email Configuration API
app.post("/uploadEmailConfig", async (req, res) => {
  try {
    const { data } = req.body;

    // const newTemplate = new EmailTemplate({ template: data });
    // await newTemplate.save();

    res.json({ success: true, message: "Email template saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error saving template" });
  }
});

app.post("/renderAndDownloadTemplate", async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ message: "Config is required" });
    }

    const layoutPath = path.join(__dirname, "layout.html");
    const layoutContent = fs.readFileSync(layoutPath, "utf8");

    const renderedHtml = ejs.render(layoutContent, { html: config.html });

    const outputPath = path.join(__dirname, "output.html");
    fs.writeFileSync(outputPath, renderedHtml);

    res.download(outputPath, "rendered-template.html", (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error sending file" });
      }

      fs.unlinkSync(outputPath);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error rendering template" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
