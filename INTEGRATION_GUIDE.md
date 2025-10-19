# Integration Guide: CreatePostModal

## Quick Integration Steps

### Step 1: Import the Modal
Already done! ✅
```typescript
import { CreatePostModal } from "@/components/social/create-post-modal";
```

### Step 2: Add Modal State
Find this line in your feed page (around line 115):
```typescript
const [showCreatePost, setShowCreatePost] = useState(false);
```

**Replace with:**
```typescript
const [showCreatePostModal, setShowCreatePostModal] = useState(false);
```

### Step 3: Replace the Create Post Card

**Find this section** (around line 467-639):
```typescript
{/* Create Post Section */}
<Card className={cn(
  "p-6 mb-8 border-2 backdrop-blur-xl transition-all duration-300",
  // ... lots of create post code
)}>
  {/* ... Textarea, buttons, etc. */}
</Card>
```

**Replace with this simple trigger:**
```typescript
{/* Create Post Trigger */}
<Card
  className={cn(
    "p-6 mb-8 border-2 backdrop-blur-xl transition-all duration-300 cursor-pointer",
    "hover:shadow-xl hover:scale-[1.01]",
    theme === 'light'
      ? "bg-white/80 border-black/5 hover:border-brand/30"
      : "bg-zinc-950/80 border-white/5 hover:border-brand/30"
  )}
  onClick={() => setShowCreatePostModal(true)}
>
  <div className="flex items-center gap-4">
    <Avatar className="w-12 h-12 ring-2 ring-brand/10">
      <AvatarImage src={user.avatar} />
      <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold">
        {user.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <p className="text-muted-foreground text-lg">
        What do you want to talk about?
      </p>
    </div>
    <Button
      className="gap-2 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white"
      onClick={(e) => {
        e.stopPropagation();
        setShowCreatePostModal(true);
      }}
    >
      <Plus className="w-4 h-4" />
      Create Post
    </Button>
  </div>
</Card>
```

### Step 4: Add the Modal (at the very end, before closing tags)

**Add this right before the final `</div>` of your page:**
```typescript
      {/* Create Post Modal */}
      <CreatePostModal
        open={showCreatePostModal}
        onOpenChange={setShowCreatePostModal}
        user={user}
        onPostCreated={() => fetchPosts(true)}
      />
    </div>
  );
}
```

### Step 5: Remove Unused State

**Delete these lines** (they're no longer needed):
```typescript
const [showCreatePost, setShowCreatePost] = useState(false);
const [newPostContent, setNewPostContent] = useState('');
const [newPostType, setNewPostType] = useState('text');
const [newPostMedia, setNewPostMedia] = useState<File[]>([]);
const [newPostLink, setNewPostLink] = useState('');
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
```

**Delete these functions** (modal handles everything):
```typescript
const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => { ... }
const handleLinkInput = (link: string) => { ... }
const handleEmojiSelect = (emoji: string) => { ... }
const handleCreatePost = async () => { ... }
```

## 🎨 Result

You'll have a clean, professional "Create Post" trigger that opens a beautiful modal with 9 intelligent post types!

## 🔍 Before vs After

**Before:**
- Messy inline form with 200+ lines of code
- Generic text box
- Basic functionality
- Takes up lots of space

**After:**
- Clean one-click trigger
- Professional modal
- 9 context-aware post types
- Guides users to create meaningful content
- ~50 lines of code in the page

---

**Ready to commit!** This is Phase 1 complete. 🚀
