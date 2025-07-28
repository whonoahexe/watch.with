# Subtitle Support

The watch.with app now supports subtitle functionality for synchronized video watching. This feature allows hosts to add subtitles either by uploading files or searching online subtitle databases.

## Features

### 1. Subtitle File Upload

- Supports multiple subtitle formats: `.vtt`, `.srt`, and `.ass`
- Automatic format detection and parsing
- Converts all formats to WebVTT for browser compatibility

### 2. Online Subtitle Search

- Search popular subtitle databases (currently mock implementation)
- Filter by language
- Download and add subtitles directly to the video

### 3. Subtitle Management

- Add multiple subtitle tracks
- Switch between different language tracks
- Remove unwanted subtitle tracks
- Only hosts can manage subtitles

### 4. Synchronized Subtitles

- Subtitles are synchronized across all room participants
- When host changes subtitle settings, all viewers see the changes
- Supports multiple concurrent subtitle tracks

## How to Use

### For Hosts:

1. Upload a video to the room
2. Click the subtitle button (CC icon) in the video controls
3. Choose "Add Subtitles" to either:
   - Upload a subtitle file from your computer
   - Search for subtitles online by entering the movie/show title
4. Select the desired subtitle track from the dropdown
5. All room participants will see the selected subtitles

### For Participants:

- View subtitles selected by the host
- Cannot add or remove subtitle tracks (host-only feature)
- Can see all available subtitle tracks in the dropdown

## Technical Implementation

### Client-Side Components:

- `SubtitleManager`: Main component for managing subtitle tracks
- `SubtitleUploadDialog`: Interface for uploading subtitle files
- `SubtitleParser`: Utility for parsing different subtitle formats
- `useSubtitles`: Custom hook for subtitle state management and socket communication

### Server-Side:

- Socket events for subtitle synchronization
- Room state includes subtitle tracks and active track
- Subtitle data stored in Redis with room information

### Supported Formats:

- **WebVTT (.vtt)**: Native browser support
- **SubRip (.srt)**: Most common subtitle format
- **Advanced SubStation Alpha (.ass)**: Advanced styling support

### Socket Events:

- `set-subtitles`: Host sets subtitle tracks for the room
- `subtitles-set`: Broadcast subtitle changes to all participants

## File Structure

```
components/
  video/
    subtitle-manager.tsx          # Main subtitle management component
    subtitle-upload-dialog.tsx    # Upload interface
    video-player.tsx             # Updated to support subtitles
    video-controls.tsx           # Updated with subtitle controls

hooks/
  use-subtitles.ts              # Dedicated hook for subtitle management

lib/
  subtitle-utils.ts              # Subtitle parsing and conversion utilities

types/
  schemas.ts                     # Updated with subtitle-related types

server/
  socket/
    handlers/
      room.ts                    # Updated with subtitle socket handlers
```

## Future Enhancements

1. **Real API Integration**: Replace mock search with actual subtitle APIs like OpenSubtitles
2. **Subtitle Styling**: Custom subtitle appearance settings
3. **Auto-sync**: Automatic subtitle synchronization with video timing
4. **Multiple Languages**: Support for multiple concurrent subtitle tracks
5. **User Preferences**: Individual subtitle preferences per user

## Testing

To test the subtitle functionality:

1. Start the development server: `npm run dev`
2. Create a room and upload an MP4 video
3. Click the subtitle button in video controls
4. Upload a subtitle file or search for subtitles
5. Verify subtitles appear on the video and sync across multiple browser tabs

## Notes

- Subtitle functionality is currently only available for MP4 and HLS videos
- YouTube videos use their own subtitle system
- Large subtitle files may impact performance
- Subtitle files are processed client-side for privacy
