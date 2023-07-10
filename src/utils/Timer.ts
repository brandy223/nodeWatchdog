/**
 * Execute a timed task
 * @param functions
 * @param intervals
 * @param timeouts
 * @return {void}
 * @throws {Error} If the number of functions, intervals and timeouts is not the same
 */
export function executeTimedTask(functions: (() => void)[], intervals: number[], timeouts: number[]): void {
    if (functions.length !== intervals.length || functions.length !== timeouts.length) {
        throw new Error("The number of functions, intervals and timeouts must be the same");
    }

    for (let i = 0; i < functions.length; i++) {
        const fct = functions[i];
        const interval = intervals[i];
        const timeout = timeouts[i];

        setInterval(() => {
            console.log(fct);
            fct();
        }, interval);

        if (timeout > 0) {
            setTimeout(() => {
                // Action à effectuer si le timeout est atteint
            }, timeout);
        }
    }
}
