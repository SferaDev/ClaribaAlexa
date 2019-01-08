import mongoose from "mongoose";

const baseOptions = {
    timestamps: true
};

const databaseSchema = new mongoose.Schema({
    data: {
        type: Object,
        required: true
    }
}, baseOptions);

export const databaseModel = mongoose.model('Query', databaseSchema);