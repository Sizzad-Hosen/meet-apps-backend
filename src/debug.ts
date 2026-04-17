// src/debug.ts
import * as LiveKit from 'livekit-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
  // 1. Check SDK version & exports
  console.log('=== ALL LIVEKIT EXPORTS ===');
  console.log(Object.keys(LiveKit));

  // 2. Check EncodedFileType
  console.log('\n=== EncodedFileType ===');
  console.log((LiveKit as any).EncodedFileType);

  // 3. Check function signature
  const client = new LiveKit.EgressClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  console.log('\n=== startRoomCompositeEgress SIGNATURE ===');
  console.log(client.startRoomCompositeEgress.toString().slice(0, 500));

  // 4. Try actual call with verbose error
  console.log('\n=== ATTEMPTING EGRESS ===');
  
  try {
    // Attempt A - oneof pattern
    console.log('Trying attempt A: oneof pattern...');
    const res = await client.startRoomCompositeEgress('test-room', {
      output: { case: 'file', value: { filepath: 'test.mp4', fileType: 1 } }
    } as any);
    console.log('✅ Attempt A worked:', res);
  } catch (e: any) {
    console.log('❌ Attempt A failed:', e.message);
  }

  try {
    // Attempt B - flat file
    console.log('Trying attempt B: flat file...');
    const res = await client.startRoomCompositeEgress('test-room', {
      file: { filepath: 'test.mp4', fileType: 1 }
    } as any);
    console.log('✅ Attempt B worked:', res);
  } catch (e: any) {
    console.log('❌ Attempt B failed:', e.message);
  }

  try {
    // Attempt C - 3rd argument
    console.log('Trying attempt C: 3rd argument...');
    const res = await client.startRoomCompositeEgress(
      'test-room',
      {} as any,
      { file: { filepath: 'test.mp4', fileType: 1 } } as any
    );
    console.log('✅ Attempt C worked:', res);
  } catch (e: any) {
    console.log('❌ Attempt C failed:', e.message);
  }

  try {
    // Attempt D - EncodedFileOutput directly as 2nd arg
    console.log('Trying attempt D: EncodedFileOutput as 2nd arg...');
    const res = await (client as any).startRoomCompositeEgress(
      'test-room',
      { filepath: 'test.mp4', fileType: 1 }
    );
    console.log('✅ Attempt D worked:', res);
  } catch (e: any) {
    console.log('❌ Attempt D failed:', e.message);
  }
}

debug().catch(console.error);