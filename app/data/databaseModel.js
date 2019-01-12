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

export async function getLastDatabaseEntry() {
    let result = await databaseModel.find().limit(1).sort({$natural: -1});
    return result[0];
}

export const databaseModel = mongoose.model('Query', databaseSchema);