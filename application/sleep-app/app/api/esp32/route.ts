import { NextRequest, NextResponse } from 'next/server';

interface ESP32Command {
  command: string;
  data?: any;
}

const FRONTEND_SERVER_URL = 'http://127.0.0.1:3001';
const BACKEND_WS_URL = process.env.ESP32_WS_URL || 'ws://127.0.0.1:3002';
// Ensure this route runs on the Node.js runtime (required for 'ws' library)
export const runtime = 'nodejs';
// Prevent caching for live event streams
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: ESP32Command = await request.json();
    const { command, data } = body;

    console.log(`Sending ESP32 Command: ${command}`, data);

    // Send command to local agent
    const response = await fetch(`${FRONTEND_SERVER_URL}/command`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command, data }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
    console.log(`✅ Command '${command}' successfully sent to ESP32`);
    return NextResponse.json({ 
        success: true, 
        message: `Command '${command}' sent to ESP32`,
        timestamp: new Date().toISOString(),
        agentResponse: result
    });
    } else {
    console.error(`❌ Failed to send command '${command}':`, result.error);
    return NextResponse.json(
        { 
        success: false, 
        error: result.error || 'Local agent failed to process command',
        command 
        },
        { status: 500 }
        );
    }
    } catch (error) {
        console.error('ESP32 API Error:', error);
        return NextResponse.json(
        { success: false, error: 'Failed to process ESP32 command' },
        { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    // Stream live ESP32 messages as Server-Sent Events (SSE)
    // This connects to the local bridge WebSocket and forwards all incoming
    // messages to the client as SSE "data:" frames.
    try {
        // Defer import so this file remains ESM-friendly in Next.js
    const wsMod: any = await import('ws');
    const WS: any = wsMod.WebSocket || wsMod.default || wsMod;

        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                const encoder = new TextEncoder();

                const write = (line: string) => {
                    controller.enqueue(encoder.encode(line));
                };
                const send = (data: string) => write(`data: ${data}\n\n`);
                const comment = (text: string) => write(`: ${text}\n\n`);

                // Initial welcome comment and event
                comment('ESP32 SSE stream connected');
                send(JSON.stringify({ type: 'sse_connected', timestamp: new Date().toISOString() }));

                // Connect to backend WS bridge
                const ws = new WS(BACKEND_WS_URL);

                ws.on('open', () => {
                    send(JSON.stringify({ type: 'ws_open', timestamp: new Date().toISOString() }));
                });

                ws.on('message', (data: any) => {
                    let payload: string;
                    if (typeof data === 'string') payload = data;
                    else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) payload = data.toString('utf8');
                    else payload = String(data ?? '');
                    // Forward raw message one-to-one; clients can JSON.parse as needed
                    send(payload);
                });

                ws.on('close', (code: any, reason: any) => {
                    const reasonText = typeof reason === 'string' ? reason : (reason && reason.toString ? reason.toString() : '');
                    send(JSON.stringify({ type: 'ws_close', code, reason: reasonText, timestamp: new Date().toISOString() }));
                    controller.close();
                });

                ws.on('error', (err: any) => {
                    const message = err && err.message ? err.message : 'unknown error';
                    send(JSON.stringify({ type: 'ws_error', message, timestamp: new Date().toISOString() }));
                    // Close the stream on error to let client retry
                    controller.close();
                });

                // Keep-alive comments so proxies don't close idle connections
                const keepAlive = setInterval(() => comment('ping'), 15000);

                // Abort handling when client disconnects
                const abort = () => {
                    clearInterval(keepAlive);
                    try { ws.close(); } catch {}
                };

                // NextRequest exposes an AbortSignal for client disconnects
                request.signal.addEventListener('abort', abort);
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('ESP32 SSE Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to establish SSE stream' }, { status: 500 });
    }
}