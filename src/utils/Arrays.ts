
/**
 * Compare 2 arrays
 * @param {any[]} a First array
 * @param {any[]} b Second array
 * @return {boolean} True if the arrays are the same, false otherwise
 * @throws {Error} No arrays given
 */
export async function compareArrays(a: any[], b: any[]): Promise<boolean> {
    if (a.length === 0 || b.length === 0) throw new Error("No arrays given");
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const objA = a[i];
        const objB = b[i];
        if (JSON.stringify(objA) !== JSON.stringify(objB)) return false;
    }
    return true;
}