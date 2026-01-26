
async function allowedUpdateKeys(input,allowedKeys) {
    if (typeof input !== 'object' || input === null || input === undefined) {
        return {};
    }
    const output = {};
    for (const key of allowedKeys) {
        if (key in input) {
            output[key] = input[key];
        }
    }
    return output;
}

module.exports = {
    allowedUpdateKeys,
};