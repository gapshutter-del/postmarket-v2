const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.memoryStorage(),
});

const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const supabase = require("../config/supabase");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const {
      title,
      objective,
      caption,
      notes,
    } = req.body;

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        advertiser_ref: payload.sub,
        title,
        objective,
        caption,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
  .from("campaign_activity")
  .insert({
    campaign_ref: data.campaign_ref,
    actor_ref: payload.sub,
    actor_role: "advertiser",
    activity_type: "CAMPAIGN_CREATED",
    message: "Campaign created.",
  });

    return res.json({
      success: true,
      data,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/:campaignRef", async (req, res) => {
  try {

    const { campaignRef } = req.params;

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("campaign_ref", campaignRef)
      .eq("advertiser_ref", payload.sub)
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data,
    });

  } catch (err) {

    console.error("Campaign GET error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  }
});

router.post(
  "/:campaignRef/assets",
  upload.single("file"),
  async (req, res) => {
    try {
      const { campaignRef } = req.params;

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded.",
        });
      }

      const extension = path.extname(req.file.originalname);

      const fileName =
        Date.now() + "-" + Math.random().toString(36).slice(2) + extension;

      const storagePath = `${campaignRef}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("campaign_assets")
        .insert({
          campaign_ref: campaignRef,
          file_name: req.file.originalname,
          file_type: req.file.mimetype,
          file_size: req.file.size,
          storage_path: storagePath,
          uploaded_by: payload.sub,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
  .from("campaign_activity")
  .insert({
    campaign_ref: campaignRef,
    actor_ref: payload.sub,
    actor_role: "advertiser",
    activity_type: "ASSET_UPLOADED",
    message: `${req.file.originalname} uploaded.`,
    metadata: {
      asset_id: data.id,
      storage_path: storagePath,
      file_type: req.file.mimetype,
    },
  });
  

      res.json({
        success: true,
        data,
      });

        } catch (err) {

      console.error("========== ASSET UPLOAD ERROR ==========");
      console.error(err);

      if (err.message) {
        console.error(err.message);
      }

      if (err.error) {
        console.error(err.error);
      }

      console.error("========================================");

      return res.status(500).json({
        success: false,
        message: err.message || "Unable to upload asset.",
      });

    }
  }
);

router.get("/:campaignRef/activity", async (req, res) => {
  try {

    const { campaignRef } = req.params;

    const { data, error } = await supabase
      .from("campaign_activity")
      .select("*")
      .eq("campaign_ref", campaignRef)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to load campaign activity.",
    });

  }
});

module.exports = router;