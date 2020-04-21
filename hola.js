const shim = require('fabric-shim');

const Chaincode = class {
    async Init(stub) {
        // use the instantiate input arguments to decide initial chaincode state values

        // save the initial states
        await stub.putState(key, Buffer.from(aStringValue));

        return shim.success(Buffer.from('Initialized Successfully!'));
    }

    async Invoke(stub) {
        // use the invoke input arguments to decide intended changes

        // retrieve existing chaincode states
        let oldValue = await stub.getState(key);

        // calculate new state values and saves them
        let newValue = oldValue + delta;
        await stub.putState(key, Buffer.from(newValue));

        return shim.success(Buffer.from(newValue.toString()));
    }
};
shim.start(new Chaincode());
