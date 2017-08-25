pragma solidity ^0.4.13;

contract ReentracyHandlingContract{

    bool locked;

    modifier noReentrancy() {
        require(!locked);
        locked = true;
        _;
        locked = false;
    }
}
