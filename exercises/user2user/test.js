var sip = require ('sip-lab')
var Zeq = require('@mayama/zeq')
var z = new Zeq()
var m = require('data-matching')
var sip_msg = require('sip-matching')
var sdp = require('sdp-matching')
var assert = require('assert')

async function test() {
    sip.set_log_level(9)
    sip.dtmf_aggregation_on(500)

    z.trap_events(sip.event_source, 'event', (evt) => {
        const e = evt.args[0]
        return e
    })

    console.log(sip.start((data) => { console.log(data)} ))

    const t1 = sip.transport.create({address: "127.0.0.1"})
    const t2 = sip.transport.create({address: "127.0.0.1"})

    console.log("t1", t1)
    console.log("t2", t2)

    const server = '127.0.0.1:5060'
    const domain = 'test1.com'

    const a1 = sip.account.create(t1.id, {
        domain,
        server,
        username: 'user1',
        password: 'pass1',
        expires: 60,
    })
    const a2 = sip.account.create(t2.id, {
        domain,
        server,
        username: 'user2',
        password: 'pass2',
        expires: 60,
    })

    sip.account.register(a1, {auto_refresh: true})
    sip.account.register(a2, {auto_refresh: true})

    await z.wait([
        {
            event: 'registration_status',
            account_id: a1.id,
            code: 200,
            reason: 'OK',
            expires: 60
        },
        {
            event: 'registration_status',
            account_id: a2.id,
            code: 200,
            reason: 'OK',
            expires: 60
        },
    ], 1000)

    console.log("a1", a1)
    console.log("a2", a2)
    const oc = sip.call.create(t1.id, {
        from_uri: 'sip:user1@test1.com',
        to_uri: `sip:user2@${server}`,
        headers: {
            'X-Test': 'ABC',
        },
    })

    await z.wait([
        {
            event: 'incoming_call',
            call_id: m.collect('call_id'),
            transport_id: t2.id,
            msg: sip_msg({
                hdr_x_test: m.absent,
            }),
        },
        {
            event: 'response',
            call_id: oc.id,
            method: 'INVITE',
            msg: sip_msg({
                $rs: '100',
            }),
        },
    ], 1000)
    const ic = {
        id: z.store.call_id,
    }

    sip.call.respond(ic.id, { code: 200, reason: 'OK' })

    z.add_event_filter({ event: 'media_update', status: 'setup_ok' })
    z.add_event_filter({ event: 'media_update', status: 'ok' })
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
    await z.sleep(500)

    sip.call.terminate(oc.id)

    await z.wait([
        {
            event: 'response',
            call_id: oc.id,
            msg: sip_msg({
                $rs: '200',
                $rr: 'OK',
            }),
        },
        {
            event: 'call_ended',
            call_id: oc.id,
        },
        {
            event: 'call_ended',
            call_id: ic.id,
        },
    ], 1000)

    sip.account.unregister(a1)
    sip.account.unregister(a2)

    await z.wait([
        {
            event: 'registration_status',
            account_id: a1.id,
            code: 200,
            reason: 'OK',
            expires: 0,
        },
        {
            event: 'registration_status',
            account_id: a2.id,
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

