import User from '../models/User.mjs';

// GET profile info
export const getProfile = async (req, res) => {
    try {
        // Returns the profile info
        if (!req.user || !req.user.profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.status(200).json(req.user.profile);
    } catch (error) {
        res.status(500).json({ message: "Server error while retrieving profile info", error: error.message });
    }
};

// PUT profile info update
export const updateProfile = async (req, res) => {
    try {
        const { profile } = req.body;
        const userId = req.user._id;

        // Updates entire profile, even if a field didn't change to simplify this process, instead of updating all
        // profile fields it just replaces the entire profile object in the user database entry
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { profile } },
            {
                new: true,
                runValidators: true
            }
        ).select('profile');

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profile: updatedUser.profile
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};