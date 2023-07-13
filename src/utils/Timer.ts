
/**
 * Execute a timed task
 * @param {any[]} functions
 * @param {number[]} intervals
 * @param {number[]} timeouts
 * @return {Promise<any[]>} Array of setIntervals variables
 * @throws {Error} If the number of functions, intervals and timeouts is not the same
 */
export async function executeTimedTask(functions: (() => void)[], intervals: number[], timeouts: number[]): Promise<any[]> {
    if (functions.length !== intervals.length || functions.length !== timeouts.length)
        throw new Error("The number of functions, intervals and timeouts must be the same");

    const intervalsTabs: any[] = [];

    for (let i = 0; i < functions.length; i++) {
        const fct = functions[i];
        const interval = intervals[i];
        const timeout = timeouts[i];

        const intervalVar = setInterval(() => {
            fct();
        }, interval);

        if (timeout > 0) {
            setTimeout(() => {
                // Action à effectuer si le timeout est atteint
            }, timeout);
        }

        intervalsTabs.push(intervalVar);
    }
    return intervalsTabs;
}

/**
 * Clear all intervals in an array
 * @param {any[]} intervalsTab Array of setItervals functions
 * @return {Promise<void>}
 * @throws {Error} If the array is empty
 */
export function clearAllIntervals(intervalsTab: any[]): void {
    if (intervalsTab.length === 0) throw new Error("The intervals array is empty");
    for (const interval of intervalsTab) {
        clearInterval(interval);
    }
}