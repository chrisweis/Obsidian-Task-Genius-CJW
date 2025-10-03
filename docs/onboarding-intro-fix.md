# Onboarding Intro Step 修复文档

## 问题描述

在引导流程（Onboarding）的 Intro 步骤中，第四条消息（intro-line-4）在显示后立即被清除，用户无法阅读完整内容。

**问题消息内容：**
> "In the current version, Task Genius provides a brand new visual and interactive experience: Fluent; while also providing the option to return to the previous interface. Which one do you prefer?"

## 根本原因

### 错误的实现逻辑

在重构后的代码中（commit 8f5daebd），`IntroStep.ts` 的实现逻辑是：

```typescript
// 错误的实现
new TypingAnimation(typingContainer, messages, () => {
    // 打字完成后立即切换步骤
    footerEl.style.display = "";
    controller.setStep(OnboardingStep.MODE_SELECT);  // ❌ 这里切换步骤
});
```

当 `controller.setStep(OnboardingStep.MODE_SELECT)` 被调用时：
1. `ModeSelectionStep.render()` 被触发
2. 该方法首先调用 `contentEl.empty()` 清空内容
3. `intro-line-4` 消息被立即清除
4. 用户几乎看不到消息内容

### 原始的正确逻辑

在旧版本中（commit 491e2a6），`IntroTyping` 组件的实现是：

```typescript
// 正确的实现
this.introTyping.render(this.onboardingContentEl, () => {
    // 打字完成后，在同一容器中添加模式选择
    const modeContainer = this.onboardingContentEl.createDiv({
        cls: "intro-mode-selection-container"
    });

    this.modeSelection.render(modeContainer, this.state.uiMode, (mode) => {
        this.state.uiMode = mode;
        // 用户选择后才显示 footer
        this.footerEl.style.display = '';
        this.updateButtonStates();
    });
});
```

**关键区别：**
- ✅ 不切换步骤，保持在 INTRO 步骤
- ✅ 在同一个 `contentEl` 中追加模式选择 UI
- ✅ `intro-line-4` 消息保留在页面上
- ✅ 用户可以完整阅读消息后再选择模式

## 解决方案

### 修改的文件

1. **`src/components/features/onboarding/steps/IntroStep.ts`**
   - 修改 `TypingAnimation` 的 `onComplete` 回调
   - 不再切换到 MODE_SELECT 步骤
   - 而是在同一容器中渲染模式选择 UI

2. **`src/components/features/onboarding/steps/ModeSelectionStep.ts`**
   - 添加新方法 `renderInline()`
   - 该方法不清空容器，直接在给定容器中渲染
   - 接受自定义的 `onSelect` 回调

### 具体实现

#### IntroStep.ts 修改

```typescript
// Start typing animation
new TypingAnimation(typingContainer, messages, () => {
    // After typing completes, show mode selection in same container
    const modeContainer = introWrapper.createDiv({
        cls: "intro-mode-selection-container"
    });

    // Render mode selection inline (without clearing intro-line-4)
    ModeSelectionStep.renderInline(
        modeContainer,
        controller,
        (mode: UIMode) => {
            // User selected a mode, show footer with Next button
            controller.setUIMode(mode);
            footerEl.style.display = "";
        }
    );
});
```

#### ModeSelectionStep.ts 新增方法

```typescript
/**
 * Render mode selection inline (for intro step)
 * This version doesn't clear the container and calls a custom callback
 */
static renderInline(
    containerEl: HTMLElement,
    controller: OnboardingController,
    onSelect: (mode: UIMode) => void
) {
    // Get current state
    const currentMode = controller.getState().uiMode;

    // Create cards configuration
    const cardConfigs: SelectableCardConfig<UIMode>[] = [
        // ... 卡片配置
    ];

    // Render selectable cards
    const card = new SelectableCard<UIMode>(
        containerEl,
        cardConfigs,
        {
            containerClass: "selectable-cards-container",
            cardClass: "selectable-card",
            showPreview: true,
        },
        (mode) => {
            onSelect(mode);  // 调用自定义回调
        }
    );

    // Set initial selection
    if (currentMode) {
        card.setSelected(currentMode);
    }

    // Add info alert
    Alert.create(
        containerEl,
        t("You can change this option later in settings"),
        {
            variant: "info",
            className: "mode-selection-tip",
        }
    );
}
```

## 用户体验流程

修复后的用户体验流程：

1. **打字动画阶段**
   - 显示 "Hi,"
   - 显示 "Thank you for using Task Genius"
   - 显示长文本，然后淡出前三条消息
   - 显示 `intro-line-4` 消息（关键消息）

2. **模式选择阶段**
   - `intro-line-4` 消息**保留在页面上**
   - 在消息下方显示模式选择卡片（Fluent vs Legacy）
   - 用户可以完整阅读消息内容
   - 用户选择模式后，显示 Next 按钮

3. **下一步**
   - 用户点击 Next 按钮
   - 才清除内容并进入下一个步骤

## CSS 样式支持

相关的 CSS 样式已经存在于 `src/styles/onboarding.css`：

```css
/* Mode selection container that appears after intro typing */
.intro-mode-selection-container {
    animation: fadeInFromBottom 0.6s ease-out;
    animation-fill-mode: both;
    width: 100%;
    margin-top: var(--size-4-10);
}

.intro-line-4 {
    font-size: clamp(1rem, 2vw, 1.4rem);
    color: var(--text-muted);
    line-height: 1.8;
    margin-bottom: var(--size-4-5);
}
```

## 测试验证

构建成功，无错误：

```bash
npm run build
# ✅ Build successful
# dist\main.js     3.7mb
# dist\main.css  345.1kb
```

## 导航逻辑修复

### 问题

修复 intro 消息显示后，发现了新的导航问题：

当用户在 INTRO 步骤中选择模式后点击 Next，会经过以下流程：
1. INTRO → MODE_SELECT（因为 handleNext 中 INTRO 的下一步是 MODE_SELECT）
2. MODE_SELECT 被渲染（但用户已经选择过了）
3. 用户再次点击 Next
4. MODE_SELECT → FLUENT_COMPONENTS（**跳过了 FLUENT_PLACEMENT**）

### 解决方案

修改 `OnboardingController.ts` 中的 `handleNext()` 逻辑：

```typescript
case OnboardingStep.INTRO:
    // Mode selection is now inline in INTRO step
    // So we skip MODE_SELECT and go directly based on selected mode
    if (this.state.uiMode === 'fluent') {
        nextStep = OnboardingStep.FLUENT_PLACEMENT;  // ✅ 正确跳转
    } else {
        // Legacy mode: check for existing changes
        if (this.state.userHasChanges) {
            nextStep = OnboardingStep.SETTINGS_CHECK;
        } else {
            nextStep = OnboardingStep.USER_LEVEL_SELECT;
        }
    }
    break;

case OnboardingStep.MODE_SELECT:
    // This step is now integrated into INTRO, but keep for backward compatibility
    if (this.state.uiMode === 'fluent') {
        nextStep = OnboardingStep.FLUENT_PLACEMENT;  // ✅ 修复：不再跳过
    } else {
        // Legacy mode: check for existing changes
        if (this.state.userHasChanges) {
            nextStep = OnboardingStep.SETTINGS_CHECK;
        } else {
            nextStep = OnboardingStep.USER_LEVEL_SELECT;
        }
    }
    break;
```

### 修复后的流程

**Fluent 模式：**
1. INTRO（包含模式选择）
2. FLUENT_PLACEMENT（选择 Sideleaves 或 Inline）
3. FLUENT_COMPONENTS（组件预览）
4. SETTINGS_CHECK 或 USER_LEVEL_SELECT（根据是否有更改）

**Legacy 模式：**
1. INTRO（包含模式选择）
2. SETTINGS_CHECK（如果有更改）或 USER_LEVEL_SELECT（如果没有更改）

## 总结

通过恢复原始的实现逻辑并修复导航逻辑，现在：

**消息显示：**
- ✅ `intro-line-4` 消息完整显示在页面上
- ✅ 在模式选择卡片上方保留
- ✅ 用户有充足时间阅读
- ✅ 只有在点击 Next 后才被清除

**导航流程：**
- ✅ INTRO 步骤包含模式选择（内联）
- ✅ 选择 Fluent 后正确进入 FLUENT_PLACEMENT
- ✅ 选择 Legacy 后根据配置进入相应步骤
- ✅ 不会跳过任何必要的步骤

这符合原始设计意图，提供了更好的用户体验。

