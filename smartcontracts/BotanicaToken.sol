// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BotanicaToken is ERC20, Ownable {
    
    mapping(address => uint256) public farmerRewards;
    mapping(address => uint256) public landownerRewards;
    mapping(address => uint256) public lastRewardTimestamp;
    
    uint256 public constant DAILY_BASE_REWARD = 1 * 10**18; // 10 tokens
    uint256 public constant MAX_DAILY_BONUS = 5 * 10**18;   // 50 tokens max
    
    event RewardDistributed(
        address indexed farmer, 
        uint256 amount, 
        uint256 sustainabilityScore,
        string grade
    );
    event LandownerBonusDistributed(address indexed landowner, uint256 amount);
    
    constructor() ERC20("BotanicaX Token", "BTNX") Ownable(msg.sender) {
        _mint(address(this), 1000000000 * 10**18); // 1 billion tokens
    }
    
    function distributeDailyReward(
        address farmer, 
        uint256 sustainabilityScore,
        string memory grade
    ) external onlyOwner {
        require(sustainabilityScore <= 1000, "Invalid score");
        require(
            block.timestamp >= lastRewardTimestamp[farmer] + 1 days,
            "Reward already claimed today"
        );
        
        // Calculate reward based on score (0-1000 scale)
        uint256 baseReward = DAILY_BASE_REWARD;
        uint256 bonus = (MAX_DAILY_BONUS * sustainabilityScore) / 1000;
        uint256 totalReward = baseReward + bonus;
        
        // Grade multiplier
        uint256 multiplier = getGradeMultiplier(grade);
        totalReward = (totalReward * multiplier) / 100;
        
        farmerRewards[farmer] += totalReward;
        lastRewardTimestamp[farmer] = block.timestamp;
        
        _transfer(address(this), farmer, totalReward);
        
        emit RewardDistributed(farmer, totalReward, sustainabilityScore, grade);
    }
    
    function distributeLandownerBonus(
        address landowner, 
        uint256 farmerScore
    ) external onlyOwner {
        // Landowner gets 20% of farmer's bonus
        uint256 farmerBonus = (MAX_DAILY_BONUS * farmerScore) / 1000;
        uint256 landownerBonus = farmerBonus / 5; // 20%
        
        landownerRewards[landowner] += landownerBonus;
        _transfer(address(this), landowner, landownerBonus);
        
        emit LandownerBonusDistributed(landowner, landownerBonus);
    }
    
    function getGradeMultiplier(string memory grade) internal pure returns (uint256) {
        bytes32 gradeHash = keccak256(abi.encodePacked(grade));
        
        if (gradeHash == keccak256(abi.encodePacked("A+")) || 
            gradeHash == keccak256(abi.encodePacked("A"))) {
            return 150; // 1.5x
        } else if (gradeHash == keccak256(abi.encodePacked("A-")) ||
                   gradeHash == keccak256(abi.encodePacked("B+"))) {
            return 125; // 1.25x
        } else if (gradeHash == keccak256(abi.encodePacked("B")) ||
                   gradeHash == keccak256(abi.encodePacked("B-"))) {
            return 100; // 1x
        } else {
            return 75; // 0.75x for C and below
        }
    }
    
    function getTotalRewards(address account) external view returns (uint256) {
        return farmerRewards[account] + landownerRewards[account];
    }
    
    function withdrawContractBalance() external onlyOwner {
        _transfer(address(this), owner(), balanceOf(address(this)));
    }
}
