var sip = require ('sip-lab')
var Zeq = require('@mayama/zeq')
var z = new Zeq()
var m = require('data-matching')
var sip_msg = require('sip-matching')
var sdp = require('sdp-matching')
var assert = require('assert')
var express = require('express')

const app = express()
app.use(express.json())
app.post('/resolution', async (req, res) => {
    console.log(req.body)
    z.push_event({
        event: 'http_req',
        req,
        res,
    })
})
app.listen(10000, () => {
    console.log('REST server started...')
})

async function test() {
    sip.set_log_level(9)
    sip.dtmf_aggregation_on(500)

    z.trap_events(sip.event_source, 'event', (evt) => {
        var e = evt.args[0]
        return e
    })

    console.log(sip.start((data) => { console.log(data)} ))

    t1 = sip.transport.create({address: "127.0.0.1"})
    t2 = sip.transport.create({address: "127.0.0.1"})

    console.log("t1", t1)
    console.log("t2", t2)

    z.add_event_filter({ event: 'non_dialog_request' })

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

    await z.wait([
        {
            event: 'registration_status',
            account_id: a1.id,
            code: 200,
            reason: 'OK',
            expires: 60
        },
    ], 1000)

    const oc = sip.call.create(t2.id, {
        from_uri: 'sip:outside@test2.com',
        to_uri: 'sip:05011112222@127.0.0.1:5080',
    })
    await z.wait([
        {
            event: 'http_req',
            req: {
                url: '/resolution',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: {
                    did: 'sip:05011112222@127.0.0.1:5080',
                    username: '05011112222',
                },
            },
            res: m.collect('res'),
        },
    ], 1000)
    console.log("\x1b[33m")
    console.log("Response to the http req here!!!")
    console.log("\x1b[0m")
    console.log(typeof z.store.res.json)
    console.log(z.store.res.json({ ruri: 'sip:user1@localhost' }))
    console.log(z.store.res)

    await z.wait([
        {
            event: 'response',
            call_id: oc.id,
            method: 'INVITE',
            msg: sip_msg({
                $rs: '100',
                // $rr: 'Trying',
            }),
        },
        {
            event: 'incoming_call',
            call_id: m.collect('call_id'),
            transport_id: t1.id,
            msg: sip_msg({
                hdr_x_test: 'DEF',
            }),
        },
    ], 2000)
    const ic = {
        id: z.store.call_id,
    }

    z.add_event_filter({ event: 'media_update' })

    sip.call.respond(ic.id, { code: 200, reason: 'OK' })

    await z.wait([
        {
            event: 'response',
            call_id: oc.id,
            method: 'INVITE',
            msg: sip_msg({
                $rs: '200',
                $rr: 'OK',
            }),
        },
    ], 1000)

    await z.sleep(1000)

    sip.call.terminate(ic.id)

    await z.wait([
        {
            event: 'call_ended',
            call_id: oc.id,
        },
        {
            event: 'call_ended',
            call_id: ic.id,
        },
        {
            event: 'response',
            call_id: ic.id,
            msg: sip_msg({
                $rs: '200',
                $rr: 'OK',
            }),
        },
    ], 1000)

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

