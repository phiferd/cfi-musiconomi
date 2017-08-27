pragma solidity ^0.4.15;
contract MisbehavingContract {
    address trigger;
    uint256 amount;
    function MisbehavingContract(address _trigger, uint256 _amount) {
        trigger = _trigger;
        amount = _amount;
    }

    function() payable {
        // will not accept payment from the trigger address
        assert(msg.sender != trigger);
    }

    function contribute(address recipient) {
        recipient.call.value(amount)();
    }
}