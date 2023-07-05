import { main } from "../src/main";
import * as core from '@actions/core';


// Unit Tests
export async function runTests() {
    try {
        await main()
        return 'pass'
    } catch (e) {
        core.error(JSON.stringify(e))
        return 'fail'
    }
}

runTests()