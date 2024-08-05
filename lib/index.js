"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const promises_1 = require("fs/promises");
const events_1 = require("events");
/**
 * Represents a database that stores data of a specific type.
 * @class
 * @extends EventEmitter
 * @template  T - The type of data that the database will store
 * @example
 * const db = new Database('user-database', { Name: String, ID: Number });
 * db.on('error', (err) => {
 *    console.log(err);
 * });
 * (async () => {
 *   if (await db.dataExists({ Name: 'John' })) {
 *      await db.delete({ Name: 'John' });
 *  } else {
 *     await db.insert({ Name: 'John', ID: 1 });
 * })();
 */
class Database extends events_1.EventEmitter {
    /**
     * Creates a new instance of the Database class.
     * @param {string} path - The path to the file where the data will be stored
     * @param {T} defaultData - The default data that will be used when inserting new data
     * @constructor
     * @example
     * const db = new Database('user-database', { Name: String, ID: Number });
     * db.on('error', (err) => {
     *   console.log(err);
     * });
     * (async () => {
     *  if (await db.dataExists({ Name: 'John' })) {
     *   await db.delete({ Name: 'John' });
     * } else {
     *  await db.insert({ Name: 'John', ID: 1 });
     * })();
     */
    constructor(path, defaultData) {
        super();
        this.path = path;
        this.defaultData = defaultData;
        this.data = [];
        /**
         * Whether an error occurred during the last operation
         */
        this.errorOccurred = false;
        /**
         * Whether the data has been loaded from the file
         */
        this.dataLoaded = false;
        if (!path.endsWith('.fastdb')) {
            this.path = `${path}.fastdb`;
        }
    }
    /**
     * @param {E} event - The name of the event to listen for
     * @param {DBEvents<T>[E]} listener - The listener function that will be called when the event is emitted
     * @template {keyof DBEvents<T>} E - The type of event to listen for
     * @returns {this} - The instance of the Database class
     * @override
     */
    on(event, listener) {
        return super.on(event, listener);
    }
    /**
     * @param {E} event - The name of the event to listen for
     * @param {DBEvents<T>[E]} listener - The listener function that will once be called when the event is emitted
     * @template {keyof DBEvents<T>} E - The type of event to listen for
     * @returns {this} - The instance of the Database class
     * @override
     */
    once(event, listener) {
        return super.once(event, listener);
    }
    /**
     * @param {E} event - The name of the event to emit
     * @param {Parameters<DBEvents<T>>[E]} args - The arguments to pass to the listener functions
     * @returns {boolean} - Whether the event was emitted successfully
     * @template {keyof DBEvents<T>} E - The type of event to emit
     * @override
     */
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    async loadData() {
        if (!this.dataLoaded) {
            try {
                const fileContent = await (0, promises_1.readFile)(this.path, 'utf-8');
                this.data = JSON.parse(fileContent);
                this.dataLoaded = true;
                this.emit('connected', { Path: this.path });
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    this.data = [];
                    await this.saveData();
                }
                else {
                    throw error;
                }
            }
        }
    }
    async saveData() {
        await (0, promises_1.writeFile)(this.path, JSON.stringify(this.data, null, 2));
    }
    /**
     * Inserts a new data entry into the database.
     * @async
     * @param {Partial<T>} data - The data to insert into the database
     * @returns {Promise<T | undefined>} - The data that was inserted into the database. Undefined if an error occurred
     * @example
     * const data = await db.insert({ Name: 'John', ID: 1 });
     * console.log(data.Name); // John
     * console.log(data.ID); // 1
     */
    async insert(data) {
        try {
            await this.loadData();
            if (!data) {
                this.emit('error', new Error('Data to insert cannot be empty'));
                return undefined;
            }
            const newEntry = { ...this.defaultData, ...data };
            this.data.push(newEntry);
            await this.saveData();
            this.emit('newData', newEntry);
            return newEntry;
        }
        catch (error) {
            this.emit('error', error);
            this.errorOccurred = true;
            return undefined;
        }
    }
    /**
     * Gets all the data entries in the database and returns them.
     * @async
     * @returns {Promise<T[] | null>} - The data entries that were found. Null if an error occurred
     * @example
     * const data = await db.getAll();
     * console.log(data[0].Name); // John
     * console.log(data[0].ID); // 1
     */
    async getAll() {
        try {
            await this.loadData();
            return this.data;
        }
        catch (error) {
            this.emit('error', error);
            this.errorOccurred = true;
            return null;
        }
    }
    /**
     * Deletes all the data entries in the database.
     * @async
     * @returns {Promise<boolean>} - Whether the operation was successful
     * @example
     * const success = await db.deleteAll();
     * console.log(success); // true
     * console.log(await db.getAll()); // []
     */
    async deleteAll() {
        try {
            await this.loadData();
            const originalLength = this.data.length;
            this.data = [];
            await this.saveData();
            this.emit('dataDeleted', { OriginalLength: originalLength, ActualLength: 0, Completed: true });
            return true;
        }
        catch (error) {
            this.emit('error', error);
            this.errorOccurred = true;
            return false;
        }
    }
    /**
     * Gets a single data entry in the database that matches the query and returns it.
     * @async
     * @param {Partial<T>} query - The query to search for in the database
     * @returns {Promise<T | undefined>} - The data entry that was found. Undefined if an error occurred
     * @example
     * const data = await db.get({ Name: 'John' });
     * console.log(data.Name); // John
     * console.log(data.ID); // 1
     */
    async get(query) {
        try {
            await this.loadData();
            if (!query) {
                this.emit('error', new Error('Cannot search for an empty query'));
                return undefined;
            }
            return this.data.find(entry => {
                for (const key in query) {
                    if (query[key] !== entry[key]) {
                        return false;
                    }
                }
                return true;
            });
        }
        catch (error) {
            this.emit('error', error);
            this.errorOccurred = true;
            return undefined;
        }
    }
    /**
     * Deletes data entries in the database that match the query.
     * @async
     * @param {Partial<T>} query - The query to search for in the database
     * @returns {Promise<number>} - The number of data entries that were deleted
     * @example
     * const count = await db.delete({ Name: 'John' });
     * console.log(count); // 1
     * console.log(await db.getAll()); // []
     */
    async delete(query) {
        try {
            await this.loadData();
            if (!query || Object.keys(query).length === 0) {
                throw new Error('Cannot delete with an empty query');
            }
            const originalLength = this.data.length;
            this.data = this.data.filter(entry => {
                for (const key in query) {
                    if (query[key] !== entry[key]) {
                        return true;
                    }
                }
                return false;
            });
            const deletedCount = originalLength - this.data.length;
            await this.saveData();
            this.emit('dataDeleted', {
                OriginalLength: originalLength,
                ActualLength: this.data.length,
                Completed: true
            });
            return deletedCount;
        }
        catch (error) {
            this.emit('error', error);
            this.errorOccurred = true;
            return 0;
        }
    }
    /**
     * Determines whether data entries exist in the database that match the query.
     * @async
     * @param {Partial<T>} query - The query to search for in the database
     * @returns {Promise<boolean>} - Whether the data entries exist in the database
     * @example
     * const exists = await db.dataExists({ Name: 'John' });
     * console.log(exists); // true
     */
    async dataExists(query) {
        try {
            await this.loadData();
            if (!query || Object.keys(query).length === 0) {
                throw new Error('Cannot check existence with an empty query');
            }
            return this.data.some(entry => {
                for (const key in query) {
                    if (query[key] !== entry[key]) {
                        return false;
                    }
                }
                return true;
            });
        }
        catch (error) {
            this.emit('error', error);
            this.errorOccurred = true;
            return false;
        }
    }
}
exports.Database = Database;