pragma solidity ^0.4.13;

contract StandardContract {
    // allows usage of "require" as a modifier
    modifier requires(bool b) {
        require(b);
        _;
    }

    // require at least one of the two conditions to be true
    modifier requiresOne(bool b1, bool b2) {
        require(b1 || b2);
        _;
    }

    modifier notNull(address a) {
        require(a != 0);
        _;
    }

    modifier notZero(uint256 a) {
        require(a != 0);
        _;
    }
}