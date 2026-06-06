// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HouseRegistry
/// @notice Lightweight registry that tracks houses and their owners on Base.
contract HouseRegistry {
    struct House {
        address owner;
        string name;
        string description;
        string imageURI;
        uint256 createdAt;
        uint256 roundCount;
    }

    House[] public houses;

    event HouseCreated(uint256 indexed houseId, address indexed owner, string name);
    event HouseUpdated(uint256 indexed houseId, string name, string description);

    /// @notice Create a new house
    /// @param _name The house name
    /// @param _description The house description
    /// @param _imageURI The house profile image URI
    /// @return houseId The ID of the newly created house
    function createHouse(
        string calldata _name,
        string calldata _description,
        string calldata _imageURI
    ) external returns (uint256 houseId) {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_name).length <= 128, "Name too long");

        houseId = houses.length;

        houses.push(House({
            owner: msg.sender,
            name: _name,
            description: _description,
            imageURI: _imageURI,
            createdAt: block.timestamp,
            roundCount: 0
        }));

        emit HouseCreated(houseId, msg.sender, _name);
    }

    /// @notice Update house metadata (owner only)
    function updateHouse(uint256 _houseId, string calldata _name, string calldata _description, string calldata _imageURI) external {
        require(_houseId < houses.length, "House does not exist");
        require(houses[_houseId].owner == msg.sender, "Not house owner");
        require(bytes(_name).length > 0, "Name required");

        houses[_houseId].name = _name;
        houses[_houseId].description = _description;
        houses[_houseId].imageURI = _imageURI;

        emit HouseUpdated(_houseId, _name, _description);
    }

    /// @notice Increment the round count for a house (called by the round factory)
    function incrementRoundCount(uint256 _houseId) external {
        require(_houseId < houses.length, "House does not exist");
        houses[_houseId].roundCount++;
    }

    /// @notice Get all houses owned by an account
    function getHousesForAccount(address _account) external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i = 0; i < houses.length; i++) {
            if (houses[i].owner == _account) count++;
        }

        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i = 0; i < houses.length; i++) {
            if (houses[i].owner == _account) {
                result[idx] = i;
                idx++;
            }
        }
        return result;
    }

    /// @notice Get the total number of houses
    function houseCount() external view returns (uint256) {
        return houses.length;
    }

    /// @notice Get a house by ID
    function getHouse(uint256 _houseId) external view returns (House memory) {
        require(_houseId < houses.length, "House does not exist");
        return houses[_houseId];
    }
}
