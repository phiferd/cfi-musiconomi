pragma solidity ^0.4.13;

contract ReentrancyHandler {

    bool locked;

    modifier noReentrancy() {
        require(!locked);
        locked = true;
        _;
        locked = false;
    }
}
