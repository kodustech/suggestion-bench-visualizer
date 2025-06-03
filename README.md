# 🔍 Code Suggestion Visualizer

A modern web application for reviewing and validating code suggestions visually and intuitively, similar to GitHub.

## ✨ Features

### 🔍 **Suggestion Review Mode (JSON)**
- **Intuitive Interface**: Clean and modern GitHub-inspired design
- **Visual Diff**: Side-by-side comparison between existing and improved code
- **Easy Navigation**: Navigate between suggestions with intuitive controls
- **Feedback System**: Approve or reject suggestions with comments
- **Syntax Highlighting**: Support for multiple programming languages
- **Visual Progress**: Track how many suggestions have been reviewed
- **Export**: Export feedback in JSON format

### 🥊 **A/B Comparison Mode (CSV)**
- **Model Comparison**: Compare different outputs/models side by side
- **Fluid A/B Testing**: Choose the best model with a voting system
- **Performance Ranking**: See which model is performing better
- **Detailed Statistics**: Dashboard with comparison metrics
- **Confidence Level**: Rate your certainty in the choice
- **Justification**: Add comments explaining your decisions
- **Integrated Example**: Load sample data for testing

## 🚀 How to Use

### 1. Installation

```bash
npm install
npm run dev
```

### 2. Data Formats

#### 📋 **JSON Format (Suggestion Review)**
```json
[{
    "overallSummary": "General summary of changes...",
    "codeSuggestions": [
        {
            "relevantFile": "src/example.js",
            "language": "javascript",
            "suggestionContent": "Suggestion description...",
            "existingCode": "current code...",
            "improvedCode": "improved code...",
            "oneSentenceSummary": "One-line summary...",
            "relevantLinesStart": 10,
            "relevantLinesEnd": 20,
            "label": "refactoring"
        }
    ]
}]
```

#### 📊 **CSV Format (A/B Comparison)**
```csv
id,inputs,reference_outputs,outputs
abc123,"{""filePath"": ""src/file.js"", ""language"": ""javascript""}","{""output"": ""suggestion A JSON"", ""label"": ""Model A""}","{""output"": ""suggestion B JSON"", ""label"": ""Model B""}"
```

**Required columns:**
- `id`: Unique comparison identifier
- `inputs`: JSON with input data (filePath, language, fileContent, etc.)
- `outputs`: JSON with main model output

**Optional columns:**
- `reference_outputs`: JSON with reference output
- `alternative_output_X`: JSONs with alternative outputs (for A/B/C testing)

Each `output` field must contain a structured JSON with suggestions.

### 3. Supported Languages

- JavaScript
- TypeScript
- Python
- JSON
- And more...

## 🛠️ Technologies

- **Next.js 14** - React Framework
- **TypeScript** - Static typing
- **Tailwind CSS** - Styling
- **Prism.js** - Syntax highlighting
- **Lucide React** - Icons

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles
├── components/
│   ├── CodeDiff.tsx      # Diff component
│   ├── SuggestionCard.tsx    # Suggestion card
│   └── SuggestionNavigation.tsx  # Navigation
└── types/
    └── suggestion.ts     # TypeScript types
```

## 🎯 Detailed Features

### Navigation
- First/Last suggestion
- Previous/Next
- Progress bar
- Reviewed suggestions counter

### Feedback System
- Approve/Reject buttons
- Optional comments
- Visual decision state
- Session persistence

### Export
- Structured JSON with statistics
- Decision timestamps
- Approval/rejection counters
- Complete feedback list

## 🔧 Development

### Available Commands

```bash
npm run dev      # Development
npm run build    # Production build
npm run start    # Run build
npm run lint     # Linting
```

### Component Structure

Each component is independent and reusable:

- `CodeDiff`: Displays code differences
- `SuggestionCard`: Main interface for each suggestion
- `SuggestionNavigation`: Navigation and progress controls

## 📝 Usage Example

### 🔍 **Suggestion Review Mode**
1. Select "Review Suggestions (JSON)" on the home screen
2. Paste your JSON or use "Load example"
3. Navigate through suggestions using controls
4. Evaluate each suggestion with 👍/👎
5. Add comments when necessary
6. Export feedback at the end

### 🥊 **A/B Comparison Mode**
1. Select "Compare Models A/B (CSV)" on the home screen
2. Paste your CSV or use "Load example"
3. For each comparison:
   - Analyze different outputs side by side
   - Choose the best model/suggestion
   - Set your confidence level (1-5)
   - Add justification (optional)
4. Track statistics in real-time
5. Export complete results

## 🎨 Customization

The project uses Tailwind CSS, allowing easy customization:

- Colors and themes can be changed in `tailwind.config.js`
- Code styles in `globals.css`
- Modular components for extension

## 📄 License

MIT License
