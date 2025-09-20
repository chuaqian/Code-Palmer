---
applyTo: "**"
---

Coding standards, domain knowledge, and preferences that AI should follow.

# Product Requirements Document (PRD)

## SleepSync - Smart Sleep Optimization App

### Executive Summary

SleepSync is a mobile-first web application that leverages environmental data and sleep tracking metrics to provide personalized sleep optimization recommendations. Given the 24-hour development constraint, this PRD focuses on delivering a Minimum Viable Product (MVP) with core functionality that can be expanded post-launch.

---

## 1. Product Overview

### 1.1 Vision Statement

Create an intelligent sleep companion app that learns from user sleep patterns and environmental conditions to deliver personalized recommendations for better sleep quality.

### 1.2 Goals

- **Primary:** Deliver a functional MVP within 24 hours that demonstrates core value proposition
- **Secondary:** Establish foundation for future hardware integration (sleep pebble device)
- **Tertiary:** Create engaging user experience that encourages daily usage

### 1.3 Success Metrics

- Successfully import and display sleep data from wearables
- Generate at least 3 personalized sleep recommendations
- Complete core user flow without critical bugs
- Deploy functional application by deadline

---

## 2. Technical Architecture

### 2.1 Tech Stack

```
Frontend:
- Next.js - for web and API routes
- TailwindCSS - for responsive styling
- Custom SVG-based charts (Hero UI Charts-like)

Backend:
- Next.js API Routes - serverless functions
- OpenAI API - for AI-powered recommendations

Integration:
- Apple HealthKit (iOS)
- Google Fit API (Android)
```

### 2.2 Development Approach

**Progressive Web App (PWA)** strategy to ensure:

- Single codebase for web and mobile
- Offline capability
- Push notifications
- App-like experience

---

## 3. Feature Requirements

### 3.1 MVP Features (Must Have - Hours 0-16)

#### **Phase 1: Core Setup (Hours 0-4)**

- [ ] User authentication (email/password)
- [ ] Basic onboarding flow
- [ ] Profile setup (sleep goals, typical schedule)

#### **Phase 2: Data Integration (Hours 4-8)**

- [ ] Manual sleep data input form
- [ ] Basic environmental data input (temp, light, noise levels)
- [ ] Sleep score calculation algorithm
- [ ] Data persistence in database

#### **Phase 3: Core Features (Hours 8-12)**

- [ ] Dashboard with sleep score display
- [ ] Basic sleep trend visualization (7-day view)
- [ ] Simple AI-powered recommendations (3-5 tips)
- [ ] Bedtime reminder notifications

#### **Phase 4: Polish & Deploy (Hours 12-16)**

- [ ] Responsive design optimization
- [ ] Basic error handling
- [ ] Deployment to Vercel
- [ ] Testing core flows

### 3.2 Nice-to-Have Features (Hours 16-20)

- [ ] Wearable device integration (Apple Watch/Fitbit)
- [ ] Advanced visualizations (monthly trends, correlations)
- [ ] White noise player (web audio API)
- [ ] Social features (sleep challenges)

### 3.3 Post-MVP Features (Future)

- Hardware pebble integration
- ML model training for personalized predictions
- Gamification elements
- Multi-language support

---

## 4. User Stories & Acceptance Criteria

### 4.1 Core User Journey

**Story 1: First-Time User Onboarding**

```
As a new user
I want to set up my sleep profile quickly
So that I can start tracking my sleep immediately

Acceptance Criteria:
- Onboarding takes < 2 minutes
- User sets target sleep hours
- User inputs typical bedtime/wake time
- Profile saved to database
```

**Story 2: Daily Sleep Logging**

```
As a user
I want to log my sleep quality and environmental factors
So that the app can learn my patterns

Acceptance Criteria:
- Quick input form (< 30 seconds to complete)
- Sleep duration, quality rating (1-10)
- Environmental factors (temp, light, noise)
- Data saved with timestamp
```

**Story 3: View Insights**

```
As a user
I want to see my sleep trends and get recommendations
So that I can improve my sleep quality

Acceptance Criteria:
- Dashboard loads in < 2 seconds
- Shows current week's sleep average
- Displays 3+ personalized recommendations
- Visual chart of sleep trends
```

---

## 5. UI/UX Specifications

### 5.1 Information Architecture

```
/
├── Landing (if not authenticated)
├── Login/Signup
├── Onboarding (first-time only)
├── Dashboard
│   ├── Sleep Score Card
│   ├── Quick Stats
│   └── AI Recommendations
├── Log Sleep
│   ├── Manual Input Form
│   └── Environmental Factors
├── Trends
│   ├── Weekly View
│   └── Sleep Quality Graph
└── Settings
    ├── Profile
    ├── Notifications
    └── Sleep Goals
```

### 5.2 Design Principles

- **Dark Mode First:** Reduce blue light exposure
- **Minimal Interactions:** Large touch targets for drowsy users
- **Glanceable Information:** Key metrics visible immediately
- **Calming Aesthetics:** Soft gradients, muted colors

### 5.3 Mobile-First Responsive Breakpoints

- Mobile: 320px - 768px (primary focus)
- Tablet: 769px - 1024px
- Desktop: 1025px+

---

## 6. API Specifications

### 6.1 Core Endpoints

```javascript
// Authentication
POST / api / auth / register;
POST / api / auth / login;
GET / api / auth / user;

// Sleep Data
POST / api / sleep / log;
GET / api / sleep / history;
GET / api / sleep / stats;

// Recommendations
GET / api / recommendations / generate;
GET / api / recommendations / list;

// User Settings
PUT / api / user / profile;
PUT / api / user / preferences;
```

### 6.2 Data Models

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  targetSleepHours: number;
  typicalBedtime: string;
  typicalWakeTime: string;
  createdAt: Date;
}

interface SleepLog {
  id: string;
  userId: string;
  date: Date;
  sleepDuration: number;
  sleepQuality: number; // 1-10
  environmentData: {
    temperature?: number;
    lightLevel?: string; // 'dark' | 'dim' | 'bright'
    noiseLevel?: string; // 'quiet' | 'moderate' | 'loud'
  };
  notes?: string;
}

interface Recommendation {
  id: string;
  userId: string;
  content: string;
  category: string; // 'environment' | 'routine' | 'lifestyle'
  priority: number;
  createdAt: Date;
}
```

---

## 7. Implementation Timeline (24 Hours)

### Hour-by-Hour Breakdown

**Hours 0-4: Foundation**

- Set up Next.js + React Native Expo project
- Configure Supabase authentication
- Create basic routing structure
- Implement auth flow

**Hours 4-8: Core Data Flow**

- Design database schema
- Implement sleep logging form
- Create API endpoints
- Test data persistence

**Hours 8-12: Features & AI**

- Build dashboard UI
- Implement sleep score calculation
- Integrate OpenAI for recommendations
- Create basic visualizations

**Hours 12-16: Polish & Testing**

- Responsive design adjustments
- Error handling
- User flow testing
- Bug fixes

**Hours 16-20: Enhancement & Deploy**

- Add any nice-to-have features time permits
- Performance optimization
- Deploy to Vercel
- Create basic documentation

**Hours 20-24: Buffer & Final Testing**

- Final testing across devices
- Critical bug fixes
- Prepare demo
- Documentation completion

---

## 8. Risk Mitigation

### 8.1 Technical Risks

| Risk                                | Impact | Mitigation                                               |
| ----------------------------------- | ------ | -------------------------------------------------------- |
| Wearable API integration complexity | High   | Start with manual input, add integration if time permits |
| AI recommendation quality           | Medium | Use pre-written templates as fallback                    |
| Cross-platform compatibility        | Medium | Focus on PWA, test on multiple browsers                  |
| Time constraint                     | High   | Strict prioritization, cut features aggressively         |

### 8.2 Contingency Plans

- **If behind schedule at Hour 12:** Cut all nice-to-have features
- **If API issues:** Use mock data for demonstration
- **If deployment issues:** Prepare local demo as backup

---

## 9. Definition of Done

### 9.1 MVP Completion Criteria

- [ ] User can create account and log in
- [ ] User can input sleep data manually
- [ ] Dashboard displays sleep score and trends
- [ ] At least 3 AI recommendations generated
- [ ] Application deployed and accessible via URL
- [ ] Core flow works on mobile browser
- [ ] No critical bugs in main user journey

### 9.2 Documentation Requirements

- [ ] README with setup instructions
- [ ] API documentation
- [ ] Known issues list
- [ ] Future roadmap

---

## Appendix A: Quick Start Development Commands

```bash
# Setup
npx create-next-app@latest sleepsync --typescript --tailwind --app
npm install @supabase/supabase-js react-query chart.js
npm install -D @types/react-native

# Development
npm run dev

# Build & Deploy
npm run build
vercel deploy --prod
```

## Appendix B: Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

---

I'll research popular sleep applications and Apple Health's sleep features to create a comprehensive Design Ethos Document for your SleepSync application.# Design Ethos Document

## SleepSync - Visual Design System

### 1. Design Philosophy

#### 1.1 Core Principles

- **Nocturnal First**: Designed for drowsy eyes and nighttime interaction
- **Data as Art**: Transform sleep metrics into beautiful, glanceable visualizations
- **Quiet Confidence**: Subtle animations and gentle transitions that respect rest
- **Progressive Disclosure**: Surface essential information first, details on demand
- **Ambient Intelligence**: Contextual UI that adapts to time of day

#### 1.2 Design Inspiration

Drawing from industry leaders:

- **Apple Health**: Sleep goals tracking, overnight health metrics monitoring including heart rate and respiratory rate
- **Sleep Cycle**: Heart rate analysis, audio recording for snoring detection, microphone and accelerometer usage
- **Calm/Headspace**: Serene gradients and mindful transitions
- **Oura Ring App**: Sophisticated data visualization with rings and scores

---

### 2. Color System

#### 2.1 Primary Palette

```css
/* Dark Theme Foundation */
--background-primary: #0a0b0f; /* Deep space black */
--background-secondary: #13141a; /* Midnight navy */
--background-tertiary: #1c1d26; /* Charcoal mist */

/* Accent Colors */
--sleep-gradient-start: #6b46c1; /* Deep violet */
--sleep-gradient-end: #9333ea; /* Royal purple */
--awake-accent: #fb923c; /* Sunset orange */
--rem-accent: #a78bfa; /* Lavender dream */
--light-accent: #fbbf24; /* Moonlight yellow */

/* Semantic Colors */
--success: #34d399; /* Mint green */
--warning: #f59e0b; /* Amber */
--danger: #ef4444; /* Soft red */
--info: #60a5fa; /* Sky blue */

/* Text Colors */
--text-primary: #f9fafb; /* Pure white */
--text-secondary: #9ca3af; /* Muted gray */
--text-tertiary: #6b7280; /* Subtle gray */
```

#### 2.2 Gradient Systems

```css
/* Sleep Quality Gradients */
--gradient-excellent: linear-gradient(135deg, #6366f1, #a78bfa);
--gradient-good: linear-gradient(135deg, #8b5cf6, #c084fc);
--gradient-fair: linear-gradient(135deg, #f59e0b, #fbbf24);
--gradient-poor: linear-gradient(135deg, #ef4444, #f87171);

/* Time-based Gradients */
--gradient-night: radial-gradient(ellipse at top, #1e1b4b, #0a0b0f);
--gradient-dawn: linear-gradient(180deg, #fcd34d, #f59e0b, #7c3aed);
--gradient-dusk: linear-gradient(180deg, #7c3aed, #ec4899, #f97316);
```

---

### 3. Typography

#### 3.1 Font Stack

```css
/* Primary Font Family */
font-family: -apple-system, "SF Pro Display", "Inter", system-ui, sans-serif;

/* Monospace for Data */
font-mono: "SF Mono", "JetBrains Mono", monospace;
```

#### 3.2 Type Scale

```css
/* Display */
--text-display: 3.75rem; /* 60px - Main sleep score */
--text-headline: 2.25rem; /* 36px - Section headers */
--text-title: 1.875rem; /* 30px - Card titles */
--text-subtitle: 1.25rem; /* 20px - Subsections */
--text-body: 1rem; /* 16px - Body text */
--text-caption: 0.875rem; /* 14px - Supporting text */
--text-micro: 0.75rem; /* 12px - Labels */

/* Font Weights */
--weight-thin: 100;
--weight-light: 300;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

---

### 4. Component Architecture

#### 4.1 Dashboard Home Components

##### **1. Sleep Score Circle (Hero Component)**

```jsx
// Primary focal point - Inspired by Apple Health rings
- Large circular progress ring with gradient fill
- Animated fill based on sleep quality (0-100)
- Center: Large sleep score number
- Subtitle: "Last night" or time range
- Micro-interactions: Pulse animation on data refresh
```

##### **2. Sleep Stages Bar Chart**

```jsx
// Horizontal stacked bar showing sleep phases
- Deep Sleep (dark purple)
- Light Sleep (medium purple)
- REM Sleep (light purple)
- Awake (orange accent)
- Time labels on x-axis
- Smooth transitions between stages
```

##### **3. Weekly Sleep Trend Graph**

```jsx
// 7-day line graph with area fill
- Gradient area fill under the curve
- Dots for each data point
- Today highlighted with glow effect
- Y-axis: Hours slept
- X-axis: Days of week (M-S)
- Swipe gesture for previous weeks
```

##### **4. Environmental Conditions Cards**

```jsx
// Grid of 3 mini cards
- Temperature Card:
  - Thermometer icon with fill animation
  - Current temp vs optimal range
  - Color coding (blue-cold, green-optimal, red-hot)

- Light Level Card:
  - Sun/moon icon transition
  - Lux level indicator
  - Dark/Dim/Bright status

- Noise Level Card:
  - Sound wave animation
  - Decibel meter
  - Quiet/Moderate/Loud indicator
```

##### **5. AI Insights Carousel**

```jsx
// Swipeable cards with recommendations
- Glass morphism effect
- Icon + headline + description
- Priority indicator (colored dot)
- "Learn more" expandable sections
- Smooth horizontal scroll with snap points
```

##### **6. Quick Stats Grid**

```jsx
// 2x2 grid of KPI cards
- Average Sleep Duration
  - Week average with trend arrow
  - Mini sparkline

- Sleep Debt
  - Accumulated deficit/surplus
  - Progress bar to goal

- Bedtime Consistency
  - Variance indicator
  - Streak counter

- Sleep Quality Score
  - Weekly average
  - Comparison to last week
```

##### **7. Sleep Goal Progress**

```jsx
// Linear progress bar with milestone markers
- Daily goal indicator
- Weekly progress fill
- Animated on achievement
- Celebration micro-animation on goal completion
```

##### **8. Tonight's Conditions Preview**

```jsx
// Predictive card for tonight
- Optimal bedtime suggestion
- Expected sleep quality
- Weather/environment forecast
- Smart alarm recommendation
```

##### **9. Sleep Journal Quick Entry**

```jsx
// Floating action button (FAB) style
- Quick mood selector (emoji)
- Energy level slider
- One-tap common tags (stressed, exercised, caffeine)
- Expands to full form on tap
```

##### **10. Achievement Badges**

```jsx
// Horizontal scroll of earned badges
- Glass morphism containers
- Animated icon on unlock
- Progress to next badge
- Streak achievements highlighted
```

---

### 5. Interaction Patterns

#### 5.1 Micro-interactions

```css
/* Transitions */
--transition-fast: 150ms ease-in-out;
--transition-normal: 250ms ease-in-out;
--transition-slow: 350ms ease-in-out;

/* Animations */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
  }
  50% {
    box-shadow: 0 0 40px rgba(147, 51, 234, 0.8);
  }
}
```

#### 5.2 Gesture Support

- **Swipe Down**: Refresh data
- **Swipe Left/Right**: Navigate between days/weeks
- **Pinch**: Zoom on graphs
- **Long Press**: Quick actions menu
- **Pull to Reveal**: Extended stats

---

### 6. Component Specifications

#### 6.1 Hero UI Component Mapping

##### **Bars and Circles Components**

```jsx
// Sleep Score Ring
<CircularProgress
  size="240px"
  strokeWidth="20px"
  value={sleepScore}
  gradient={true}
  gradientColors={["#6B46C1", "#9333EA"]}
  showValue={true}
  valueSize="60px"
  label="Sleep Score"
/>

// Weekly Progress Bars
<ProgressBar
  variant="stacked"
  segments={[
    { value: deep, color: "#4C1D95" },
    { value: light, color: "#7C3AED" },
    { value: rem, color: "#A78BFA" },
    { value: awake, color: "#FB923C" }
  ]}
  height="40px"
  rounded="full"
  animated={true}
/>
```

##### **Graph Components**

```jsx
// Sleep Trend Chart
<LineChart
  data={weeklyData}
  height="200px"
  showGrid={false}
  showArea={true}
  areaGradient={true}
  smooth={true}
  interactive={true}
  theme="dark"
/>

// Sleep Stages Timeline
<TimelineChart
  data={stagesData}
  height="120px"
  colors={{
    deep: "#4C1D95",
    light: "#7C3AED",
    rem: "#A78BFA",
    awake: "#FB923C"
  }}
  showTooltip={true}
/>
```

##### **KPI Stats Components**

```jsx
// Stat Cards
<StatCard
  title="Avg Sleep"
  value="7h 24m"
  trend="+12%"
  trendDirection="up"
  icon={<MoonIcon />}
  sparkline={true}
  glassEffect={true}
/>

// Mini Metrics
<MetricBadge
  label="Sleep Debt"
  value="-2.5h"
  severity="warning"
  size="small"
  animated={true}
/>
```

---

### 7. Responsive Behavior

#### 7.1 Breakpoint System

```scss
// Mobile First Approach
$mobile: 320px; // Base
$tablet: 768px; // iPad
$desktop: 1024px; // Desktop
$wide: 1440px; // Wide screens

// Component Scaling
.sleep-score-ring {
  // Mobile: Full width, centered
  width: 240px;

  @media (min-width: $tablet) {
    width: 280px;
  }

  @media (min-width: $desktop) {
    width: 320px;
  }
}
```

#### 7.2 Layout Grid

```css
/* 4-8-12 Column System */
.dashboard-grid {
  display: grid;
  gap: 16px;

  /* Mobile: 4 columns */
  grid-template-columns: repeat(4, 1fr);

  /* Tablet: 8 columns */
  @media (min-width: 768px) {
    grid-template-columns: repeat(8, 1fr);
    gap: 20px;
  }

  /* Desktop: 12 columns */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
  }
}
```

---

### 8. Accessibility & Dark Mode

#### 8.1 Accessibility Standards

```css
/* WCAG AAA Compliance */
--contrast-ratio: 7:1;  /* For normal text */
--large-text-ratio: 4.5:1;  /* For large text */

/* Focus States */
:focus-visible {
  outline: 2px solid #9333EA;
  outline-offset: 2px;
  border-radius: 8px;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 8.2 Time-Adaptive UI

```javascript
// Dynamic theme based on time
const getThemeByTime = (hour) => {
  if (hour >= 22 || hour < 6) return "night"; // Deep dark
  if (hour >= 6 && hour < 10) return "morning"; // Soft light
  if (hour >= 10 && hour < 18) return "day"; // Bright
  if (hour >= 18 && hour < 22) return "evening"; // Dimmed
};
```

---

### 9. Motion Design

#### 9.1 Animation Principles

- **Purpose**: Every animation serves a functional purpose
- **Performance**: 60fps minimum, prefer CSS transforms
- **Subtlety**: Gentle easings, no jarring movements
- **Consistency**: Shared timing functions across components

#### 9.2 Loading States

```jsx
// Skeleton Screens with Shimmer
<SkeletonLoader
  variant="circle"
  size={240}
  shimmer={true}
  baseColor="#1C1D26"
  highlightColor="#2A2B36"
/>

// Progressive Data Loading
<AnimatePresence>
  {isLoading ? (
    <PulseLoader color="#9333EA" />
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

---

### 10. Implementation Guidelines

#### 10.1 Component Library Structure

```
/components
  /ui
    /hero-ui
      CircularProgress.tsx
      ProgressBar.tsx
      LineChart.tsx
      StatCard.tsx
      MetricBadge.tsx
    /custom
      SleepScoreRing.tsx
      SleepStagesBar.tsx
      EnvironmentCard.tsx
      InsightCarousel.tsx
  /layouts
    DashboardGrid.tsx
    MobileNav.tsx
    TabletSidebar.tsx
```

#### 10.2 CSS Architecture

```scss
// Use CSS Modules with PostCSS
styles/
  globals.css          // Reset and base styles
  variables.css        // Design tokens
  animations.css       // Keyframes
  components/
    Dashboard.module.css
    SleepScore.module.css
    Charts.module.css
```

---

### 11. Visual Examples

#### 11.1 Dashboard Layout Wireframe

```
┌─────────────────────────────────────┐
│         Sleep Score Ring            │
│              [8.5]                  │
│         ◯◯◯◯◯◯◯◯◯◯                 │
└─────────────────────────────────────┘

┌──────────────┬──────────────────────┐
│ 7h 24m      │  Sleep Debt: -2.5h   │
│ Avg Sleep ↑ │  ████░░░░░░          │
└──────────────┴──────────────────────┘

┌─────────────────────────────────────┐
│      Weekly Sleep Trend             │
│    ╱╲    ╱╲                        │
│   ╱  ╲  ╱  ╲  ╱╲                   │
│  ╱    ╲╱    ╲╱  ╲                  │
│ M  T  W  T  F  S  S                │
└─────────────────────────────────────┘

┌───────┬───────┬───────┐
│ 72°F  │ Dark  │ Quiet │
│  ✓    │  ✓    │  ✓    │
└───────┴───────┴───────┘

┌─────────────────────────────────────┐
│ 💡 Try going to bed 15 min earlier  │
│    Your optimal bedtime is 10:30 PM │
│                                [>]  │
└─────────────────────────────────────┘
```

---

### 12. Design Checklist

#### Pre-Development

- [ ] All colors meet WCAG AAA standards
- [ ] Component library documented
- [ ] Responsive breakpoints defined
- [ ] Animation specs provided
- [ ] Loading states designed
- [ ] Error states designed
- [ ] Empty states designed

#### Development Review

- [ ] 60fps animations achieved
- [ ] Touch targets minimum 44x44px
- [ ] Focus states visible
- [ ] Screen reader compatible
- [ ] Reduced motion respected
- [ ] Dark theme optimized
- [ ] Glass morphism effects performant

---

**Document Version:** 1.0  
**Design System:** SleepSync Dark  
**Last Updated:** Current  
**Target Platforms:** iOS, Android (React Native), Web (PWA)

This design ethos creates a sophisticated, calming sleep tracking experience that rivals industry leaders while maintaining unique visual identity through carefully crafted dark themes, meaningful animations, and data-driven beauty.
