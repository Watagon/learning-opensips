var sip = require ('sip-lab')
var Zeq = require('@mayama/zeq')
var z = new Zeq()
var m = require('data-matching')
var sip_msg = require('sip-matching')
var sdp = require('sdp-matching')
var assert = require('assert')

async function prepare_data() {
    var mysql = require('mysql2/promise')
    const con = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'brastel',
        database: 'opensips',
    })
    await con.query('truncate table subscriber')
    await con.query(`insert subscriber set
        username = 'user1',
        domain = 'test1.com',
        ha1 = md5(concat_ws(':', username, domain, 'pass1'))
    `)
}

async function test() {
    await prepare_data()
    sip.set_log_level(9)
    sip.dtmf_aggregation_on(500)

    z.trap_events(sip.event_source, 'event', (evt) => {
        var e = evt.args[0]
        return e
    })

    console.log(sip.start((data) => { console.log(data)} ))

    t1 = sip.transport.create({address: "127.0.0.1"})

    console.log("t1", t1)

    const server = '127.0.0.1:5060'
    const domain = 'test1.com'

    const a1 = sip.account.create(t1.id, {
        domain,
        server,
        username: 'user1',
        password: 'pass1',
        expires: 60,
    })

    sip.account.register(a1, {auto_refresh: true})

    z.add_event_filter({ event: 'non_dialog_request' })

    // TODO: add auth fail case (wrong pass)
    await z.wait([
        {
            event: 'registration_status',
            account_id: a1.id,
            code: 200,
            reason: 'OK',
            expires: 60
        },
    ], 3000)

    sip.account.unregister(a1)

    await z.wait([
        {
            event: 'registration_status',
            account_id: a1.id,
            code: 200,
            reason: 'OK',
            expires: 0,
        },
    ], 1000)

    console.log("Success")

    sip.stop()
}


test()
.catch(e => {
    console.error(e)
    process.exit(1)
})

