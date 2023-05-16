const Schema = mongoose.Schema;


const modelSchema = Schema({
    SHIP_ID: {
        type: String,
        require: true,
    },
    MMSI: {
        type: String,
    },
})

module.exports = Schema("Model", modelSchema);