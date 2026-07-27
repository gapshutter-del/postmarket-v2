const crypto = require("crypto");
const express = require("express");
const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production";

// -----------------------------------------------------------------------------
// Authentication middleware
// -----------------------------------------------------------------------------

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        const token = authHeader.split(" ")[1];
        req.user = jwt.verify(token, JWT_SECRET);
        console.log("JWT payload:", req.user);
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}
// -----------------------------------------------------------------------------
// Get advertiser bookings
// -----------------------------------------------------------------------------

router.get("/my", authenticate, async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("advertiser_ref", req.user.sub)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.json({
            success: true,
            data
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// -----------------------------------------------------------------------------
// Get creator bookings
// -----------------------------------------------------------------------------

router.get("/incoming", authenticate, async (req, res) => {

    try {
console.log("Creator from JWT:", req.user.sub);
        const { data, error } = await supabase
            .from("bookings")
            .select(`
    *,
    advertiser:users!bookings_advertiser_ref_fkey(
        ref,
        name,
        company_name
    )
`)
            .eq("creator_ref", req.user.sub)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map(b => ({
    ...b,
    advertiser_name:
    b.advertiser?.company_name ||
    b.advertiser?.name ||
    b.advertiser_ref
}));

        return res.json({
            success: true,
            data: formatted
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});
// -----------------------------------------------------------------------------
// Create booking
// -----------------------------------------------------------------------------

router.post("/", authenticate, async (req, res) => {
    try {

        const {
    creatorRef,
    dates,
    budget,
    notes,
    platforms,
    deliverables,
    campaignAssets,
    slots
} = req.body;

        const advertiserRef = req.user.sub;
        const bookingId = crypto.randomUUID();
        const { data, error } = await supabase
            .from("bookings")
            .insert({
    id: bookingId,
    creator_ref: creatorRef,
    advertiser_ref: advertiserRef,
    platforms: platforms || [],
    dates,
    slots: slots || [],
    total_fee: budget,
    commission: 0,
    creator_payout: budget,
    campaign_brief: notes || null,
    campaign_assets: campaignAssets || [],
    deliverables: deliverables || [],
    status: "provisional"
})
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            data
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

// -----------------------------------------------------------------------------
// Get booking
// -----------------------------------------------------------------------------
router.get("/:id", authenticate, async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", req.params.id)
            .single();

        if (error) throw error;

        return res.json({
            success: true,
            data
        });

    } catch (err) {

        return res.status(404).json({
            success: false,
            message: err.message
        });

    }

});

// -----------------------------------------------------------------------------
// Accept booking
// -----------------------------------------------------------------------------
router.patch("/:id/accept", authenticate, async (req, res) => {

    try {

        const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", req.params.id)
            .single();

        if (bookingError) throw bookingError;

        console.log("Booking creator_ref:", booking.creator_ref);
console.log("JWT creator:", req.user.sub);

        if (booking.creator_ref !== req.user.sub) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const { data, error } = await supabase
            .from("bookings")
            .update({
                status: "confirmed",
                })
            
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) throw error;

        return res.json({
            success: true,
            data
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;
