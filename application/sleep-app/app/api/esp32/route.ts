import { NextRequest, NextResponse } from 'next/server';

interface ESP32Command {
  command: string;
  data?: any;
}

const LOCAL_AGENT_URL = 'http://127.0.0.1:3001';

export async function POST(request: NextRequest) {
  try {
    const body: ESP32Command = await request.json();
    const { command, data } = body;

    console.log(`Sending ESP32 Command: ${command}`, data);

    try {
      // Send command to local agent
      const response = await fetch(`${LOCAL_AGENT_URL}/command`, {
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

    } catch (agentError) {
      console.error('❌ Failed to connect to local agent:', agentError);
      
      // Fallback to logging if agent is not available
      console.log(`📝 Fallback - logging command: ${command}`, data);
      
      // Simulate different commands (fallback behavior)
      switch (command) {
        case 'BUZZER_TEST':
          console.log('🔊 Testing buzzer tones (fallback)');
          break;
        case 'PRESET_TONE':
          console.log(`🎵 Playing preset tone ${data?.toneId} (fallback)`);
          break;
        case 'SET_VOLUME':
          console.log(`🔊 Setting volume to ${data?.volume}% (fallback)`);
          break;
        case 'TRIGGER_SUNRISE':
          console.log('🌅 Triggering sunrise simulation (fallback)');
          break;
        case 'FAST_SUNRISE':
          console.log('⚡ Fast sunrise demo (fallback)');
          break;
        case 'TRIGGER_SUNSET':
          console.log('🌇 Triggering sunset simulation (fallback)');
          break;
        case 'RED_AMBIENT':
          console.log('🔴 Setting red ambient light (fallback)');
          break;
        case 'BLUE_CALM':
          console.log('🔵 Setting blue calm light (fallback)');
          break;
        case 'RAINBOW':
          console.log('🌈 Starting rainbow light show (fallback)');
          break;
        case 'NIGHT_LIGHT':
          console.log('🌙 Setting night light (fallback)');
          break;
        case 'TRIGGER_ALARM':
          console.log('🚨 Triggering full alarm sequence (fallback)');
          break;
        case 'STOP_ALARM':
          console.log('🛑 Stopping all alarms and effects (fallback)');
          break;
        default:
          console.log(`❓ Unknown command: ${command} (fallback)`);
      }

      return NextResponse.json({ 
        success: false,
        message: `Local agent unavailable. Command '${command}' logged but not sent to hardware.`,
        timestamp: new Date().toISOString(),
        warning: "Please start the local agent at http://127.0.0.1:3001"
      });
    }

  } catch (error) {
    console.error('ESP32 API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process ESP32 command' },
      { status: 500 }
    );
  }
}