// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LandRegistry {
    struct LandPlot {
        uint256 plotId;
        address owner;
        string gpsCoordinates;
        uint256 areaInHectares;
        bool isAvailable;
        uint256 registrationDate;
        string farmId;
        uint256 sustainabilityScore;
    }
    
    struct FarmerProfile {
        address farmerAddress;
        string name;
        uint256 experienceYears;
        uint256 reputationScore;
        uint256 stakedTokens;
        bool isVerified;
        string[] assignedFarms;
    }
    
    struct AccessPermission {
        uint256 plotId;
        address farmer;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
        uint256 sustainabilityTarget;
        uint256 currentScore;
    }
    
    mapping(uint256 => LandPlot) public landPlots;
    mapping(address => FarmerProfile) public farmers;
    mapping(bytes32 => AccessPermission) public permissions;
    mapping(string => uint256) public farmIdToPlotId;
    mapping(uint256 => bytes32) public plotToActivePermission;
    mapping(uint256 => address) public plotToActiveFarmer;
    
    uint256 public plotCounter;
    uint256 public constant MINIMUM_STAKE = 1 * 10**18;
    
    mapping(address => bool) public authorizedOracles;
    address public owner;
    
    event LandRegistered(uint256 indexed plotId, address indexed owner, string farmId);
    event FarmerRegistered(address indexed farmer, string name);
    event PermissionGranted(uint256 indexed plotId, address indexed farmer, uint256 endDate, bytes32 permissionId);
    event SustainabilityScoreUpdated(string indexed farmId, uint256 indexed plotId, address indexed farmer, uint256 score);
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender] || msg.sender == owner, "Not authorized oracle");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedOracles[msg.sender] = true;
    }
    
    function authorizeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = true;
        emit OracleAuthorized(_oracle);
    }
    
    function revokeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = false;
        emit OracleRevoked(_oracle);
    }
    
    function registerLand(
        string memory _gpsCoordinates, 
        uint256 _areaInHectares,
        string memory _farmId
    ) external {
        require(farmIdToPlotId[_farmId] == 0, "Farm ID already registered");
        
        plotCounter++;
        landPlots[plotCounter] = LandPlot({
            plotId: plotCounter,
            owner: msg.sender,
            gpsCoordinates: _gpsCoordinates,
            areaInHectares: _areaInHectares,
            isAvailable: true,
            registrationDate: block.timestamp,
            farmId: _farmId,
            sustainabilityScore: 0
        });
        
        farmIdToPlotId[_farmId] = plotCounter;
        emit LandRegistered(plotCounter, msg.sender, _farmId);
    }
    
    function registerFarmer(
        string memory _name, 
        uint256 _experienceYears
    ) external payable {
        require(msg.value >= MINIMUM_STAKE, "Insufficient stake");
        require(!farmers[msg.sender].isVerified, "Already registered");
        
        farmers[msg.sender] = FarmerProfile({
            farmerAddress: msg.sender,
            name: _name,
            experienceYears: _experienceYears,
            reputationScore: 50,
            stakedTokens: msg.value,
            isVerified: true,
            assignedFarms: new string[](0)
        });
        
        emit FarmerRegistered(msg.sender, _name);
    }
    
    function grantPermission(
        uint256 _plotId, 
        address _farmer, 
        uint256 _durationDays, 
        uint256 _sustainabilityTarget
    ) external {
        require(landPlots[_plotId].owner == msg.sender, "Not land owner");
        require(farmers[_farmer].isVerified, "Farmer not verified");
        require(landPlots[_plotId].isAvailable, "Land not available");
        require(_plotId > 0 && _plotId <= plotCounter, "Invalid plot ID");
        
        bytes32 permissionId = keccak256(abi.encodePacked(_plotId, _farmer, block.timestamp));
        uint256 endDate = block.timestamp + (_durationDays * 1 days);
        
        permissions[permissionId] = AccessPermission({
            plotId: _plotId,
            farmer: _farmer,
            startDate: block.timestamp,
            endDate: endDate,
            isActive: true,
            sustainabilityTarget: _sustainabilityTarget,
            currentScore: 0
        });
        
        plotToActivePermission[_plotId] = permissionId;
        plotToActiveFarmer[_plotId] = _farmer;
        
        farmers[_farmer].assignedFarms.push(landPlots[_plotId].farmId);
        landPlots[_plotId].isAvailable = false;
        
        emit PermissionGranted(_plotId, _farmer, endDate, permissionId);
    }
    
    // Internal function for score update logic
    function _updateScore(string memory _farmId, uint256 _score) internal {
        uint256 plotId = farmIdToPlotId[_farmId];
        require(plotId > 0, "Farm not registered");
        
        landPlots[plotId].sustainabilityScore = _score;
        
        bytes32 permissionId = plotToActivePermission[plotId];
        address activeFarmer = plotToActiveFarmer[plotId];
        
        if (permissionId != bytes32(0) && permissions[permissionId].isActive) {
            AccessPermission storage permission = permissions[permissionId];
            
            if (block.timestamp <= permission.endDate) {
                permission.currentScore = _score;
                
                if (_score >= permission.sustainabilityTarget) {
                    if (farmers[activeFarmer].reputationScore < 100) {
                        farmers[activeFarmer].reputationScore += 1;
                    }
                }
            } else {
                permission.isActive = false;
                landPlots[plotId].isAvailable = true;
            }
        }
        
        emit SustainabilityScoreUpdated(_farmId, plotId, activeFarmer, _score);
    }
    
    // Public function that uses internal logic
    function updateSustainabilityScore(
        string memory _farmId, 
        uint256 _score
    ) external onlyAuthorizedOracle {
        _updateScore(_farmId, _score);
    }
    
    // Batch update function
    function updateMultipleSustainabilityScores(
        string[] memory _farmIds,
        uint256[] memory _scores
    ) external onlyAuthorizedOracle {
        require(_farmIds.length == _scores.length, "Array length mismatch");
        
        for (uint256 i = 0; i < _farmIds.length; i++) {
            _updateScore(_farmIds[i], _scores[i]);
        }
    }
    
    function getActivePermission(uint256 _plotId) external view returns (
        address farmer,
        uint256 startDate,
        uint256 endDate,
        bool isActive,
        uint256 sustainabilityTarget,
        uint256 currentScore
    ) {
        bytes32 permissionId = plotToActivePermission[_plotId];
        require(permissionId != bytes32(0), "No active permission");
        
        AccessPermission memory permission = permissions[permissionId];
        return (
            permission.farmer,
            permission.startDate,
            permission.endDate,
            permission.isActive && block.timestamp <= permission.endDate,
            permission.sustainabilityTarget,
            permission.currentScore
        );
    }
    
    function endPermission(uint256 _plotId) external {
        require(landPlots[_plotId].owner == msg.sender, "Not land owner");
        
        bytes32 permissionId = plotToActivePermission[_plotId];
        if (permissionId != bytes32(0)) {
            permissions[permissionId].isActive = false;
            landPlots[_plotId].isAvailable = true;
            
            delete plotToActivePermission[_plotId];
            delete plotToActiveFarmer[_plotId];
        }
    }
    
    function getFarmerFarms(address _farmer) external view returns (string[] memory) {
        return farmers[_farmer].assignedFarms;
    }
    
    function getPlotByFarmId(string memory _farmId) external view returns (LandPlot memory) {
        uint256 plotId = farmIdToPlotId[_farmId];
        require(plotId > 0, "Farm not found");
        return landPlots[plotId];
    }
    
    function getFarmScore(string memory _farmId) external view returns (uint256) {
        uint256 plotId = farmIdToPlotId[_farmId];
        require(plotId > 0, "Farm not found");
        return landPlots[plotId].sustainabilityScore;
    }
    
    function isAuthorizedOracle(address _address) external view returns (bool) {
        return authorizedOracles[_address];
    }
}
