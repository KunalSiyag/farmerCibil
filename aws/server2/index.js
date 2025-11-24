require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { createCanvas } = require("canvas");

const app = express();
app.use(express.json());
app.use(cors());

// Blockchain Setup
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const sensorAPI = "http://ec2-13-127-207-136.ap-south-1.compute.amazonaws.com:5000/realtime";

const nftABI = require("./SmartRewardsNFT.json");
const tokenABI = require("./RewardToken.json");

const nftContract = new ethers.Contract(nftContractAddress, nftABI, wallet);
const tokenContract = new ethers.Contract(tokenContractAddress, tokenABI, wallet);

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

// Sustainability Thresholds
const sustainabilityThresholds = {
    humidity: { min: 30, max: 70 },
    temperature: { min: 15, max: 35 },
    soilMoisture: { min: 40, max: 80 },
    lightIntensity: { min: 100, max: 1000 }
};

let farmerData = {}; // Track farmer performance

// Fetch sensor data
async function fetchSensorData() {
    try {
        const response = await axios.get(sensorAPI);
        return [{ userAddress: "0x1234567890abcdef", ...response.data }];
    } catch (error) {
        console.error("Error fetching sensor data:", error.message);
        return null;
    }
}

// Check if a farmer qualifies
function checkQualification(data) {
    return (
        data.humidity >= sustainabilityThresholds.humidity.min &&
        data.humidity <= sustainabilityThresholds.humidity.max &&
        data.temperature >= sustainabilityThresholds.temperature.min &&
        data.temperature <= sustainabilityThresholds.temperature.max &&
        data.soilMoisture >= sustainabilityThresholds.soilMoisture.min &&
        data.soilMoisture <= sustainabilityThresholds.soilMoisture.max &&
        data.lightIntensity >= sustainabilityThresholds.lightIntensity.min &&
        data.lightIntensity <= sustainabilityThresholds.lightIntensity.max
    );
}

// Generate Certificate Image
async function generateCertificate(userAddress) {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = "#000000";
    ctx.font = "bold 36px Arial";
    ctx.fillText("Sustainability Award", 200, 100);

    // User Address
    ctx.font = "24px Arial";
    ctx.fillText(`Awarded to: ${userAddress}`, 150, 250);

    // Date
    ctx.fillText(`Date: ${new Date().toDateString()}`, 150, 300);

    // Save as PNG
    const filePath = `./certificates/${userAddress}.png`;
    fs.mkdirSync("./certificates", { recursive: true });
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

    return filePath;
}

// Upload Image to IPFS (Pinata)
async function uploadToIPFS(imagePath) {
    const data = new FormData();
    data.append("file", fs.createReadStream(imagePath));

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
        headers: {
            "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_API_KEY,
        },
    });
    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
}

// Mint NFT with the Certificate
async function mintNFT(userAddress, imagePath, rewardAmount) {
    try {
        const tokenURI = await uploadToIPFS(imagePath);
        const tx = await nftContract.mintNFT(userAddress, tokenURI, rewardAmount);
        await tx.wait();
        console.log(`✅ NFT Minted for ${userAddress}`);
    } catch (error) {
        console.error("❌ Error minting NFT:", error.message);
    }
}

// Process Farmers Daily
async function processFarmers() {
    const sensorData = await fetchSensorData();
    if (!sensorData) return;

    for (const data of sensorData) {
        const { userAddress } = data;
        
        if (checkQualification(data)) {
            farmerData[userAddress] = (farmerData[userAddress] || 0) + 1;
        } else {
            farmerData[userAddress] = 0;
        }

        if (farmerData[userAddress] >= 7) {
            console.log(`🎉 ${userAddress} qualifies for an NFT!`);
            const certificatePath = await generateCertificate(userAddress);
            await mintNFT(userAddress, certificatePath, 100);
            farmerData[userAddress] = 0;
        }
    }
}

// Schedule Daily Check
cron.schedule("0 0 * * *", processFarmers);

// Start Express Server
app.listen(3000, () => console.log("🚀 Backend running on port 3000"));

