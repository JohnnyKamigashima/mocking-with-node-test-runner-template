import { describe, it, beforeEach, after, before, afterEach } from 'node:test'
import assert from 'node:assert'
import crypto from 'node:crypto'
import TodoService from '../src/todoService.js'
import Todo from '../src/todo.js'
import sinon from 'sinon'

describe('todoService test suite', () => {
    describe('#list', () => {
        let _todoService
        let _dependencies

        const mockDatabase = [
            {
                text: 'I must meet Chaves da Silva',
                when: new Date('2021-01 - 21T00:00:00.000Z'),
                status: 'late',
                id: 'fc46b981-334d-481f-afb1-fc66289118c3'
            }
        ]

        beforeEach((context) => {

            _dependencies = {
                todoRepository: {
                    list: context.mock.fn(async () => mockDatabase)
                }
            }
            _todoService = new TodoService(_dependencies)
        })

        it('should return a list of items with uppercase text', async () => {
            const expected = mockDatabase
                .map(({ text, ...result }) => ({ text: text.toUpperCase(), ...result }))

            const result = await _todoService.list()
            assert.deepStrictEqual(result, expected)

            const fnMock = _dependencies.todoRepository.list.mock
            assert.strictEqual(fnMock.callCount(), 1)
        })
    })

    describe('#create', () => {
        let _todoService
        let _dependencies
        let _sandbox

        const mockCreateResult = [
            {
                "text": "I must plan my trip to Europe",
                "when": "2021-03-22T00:00:00.000Z",
                "status": "late",
                "id": "3b69f9c1-3c7a-40a8-96eb-9094ea957f83",
                "meta": { revision: 0, created: 1691176461051, version: 0 },
                "$loki": 3
            }
        ]

        const DEFAULT_ID = '0001'
        before((context) => {
            crypto.randomUUID = () => DEFAULT_ID
            _sandbox = sinon.createSandbox()
        })

        beforeEach((context) => {
            _dependencies = {
                todoRepository: {
                    create: context.mock.fn(async () => mockCreateResult)
                }
            }

            console.log(_dependencies.todoRepository)
            _todoService = new TodoService(_dependencies)
        })

        after(async () => {
            crypto.randomUUID = (await import('crypto')).randomUUID
        })

        afterEach(() => {
            _sandbox.restore()
        })

        it('should not save the todo item with invalid data', async () => {
            const input = new Todo({
                text: '',
                when: ''
            })
            const expected = {
                error: {
                    message: 'invalid data',
                    data: {
                        text: '',
                        when: '',
                        status: '',
                        id: DEFAULT_ID
                    }
                }
            }
            const result = await _todoService.create(input)
            console.log(result)
            assert.deepStrictEqual(JSON.stringify(result), JSON.stringify(expected))
        })

        it('should save the todo item with late status when the date is in the future', async () => {
            const properties = {
                text: 'I must plan my trip to Europe',
                when: new Date('2021-12-01 12:00:00 GMT-0')
            }
            const input = new Todo(properties)
            const expected = {
                ...properties,
                status: 'pending',
                id: DEFAULT_ID
            }

            const today = new Date('2020-12-02')
            _sandbox.useFakeTimers(today.getTime())

            await _todoService.create(input)

            const fnMock = _dependencies.todoRepository.create.mock
            assert.strictEqual(fnMock.callCount(), 1)
            assert.deepStrictEqual(fnMock.calls[0].arguments[0], expected)

        })

        it('should save todo item with pending status when the property is in the past', async () => {
            const properties = {
                text: 'I must plan my trip to Europe',
                when: new Date('2020-12-01 12:00:00 GMT-0')
            }
            const input = new Todo(properties)
            const expected = {
                ...properties,
                status: 'late',
                id: DEFAULT_ID
            }

            const today = new Date('2020-12-02')
            _sandbox.useFakeTimers(today.getTime())

            await _todoService.create(input)

            const fnMock = _dependencies.todoRepository.create.mock
            assert.strictEqual(fnMock.callCount(), 1)
            assert.deepStrictEqual(fnMock.calls[0].arguments[0], expected)
        })
    })
})