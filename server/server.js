const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const provider = new ethers.providers.JsonRpcProvider(`https://polygon-amoy.g.alchemy.com/v2/UaYqWAunkmAmGl6fqnPxRJXUPTrGGoci`);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const rewardTokenAddress = "0xabc69f5d120fd9c8eee04286024b2d1d5b831d8f";
const rewardTokenABI = [
    "function claimRewards() public"
];

const rewardTokenContract = new ethers.Contract(rewardTokenAddress, rewardTokenABI, wallet);

app.get("/sensor-data", (req, res) => {
    const data = {
        humidity: Math.random() * 100,
        temperature: Math.random() * 40,
        soilMoisture: Math.random() * 100,
        lightIntensity: Math.random() * 1000
    };
    res.json(data);
});

app.post("/claim-rewards", async (req, res) => {
    try {
        const tx = await rewardTokenContract.claimRewards();
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
