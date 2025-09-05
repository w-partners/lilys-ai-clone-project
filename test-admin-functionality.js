// Admin Functionality Test Script for https://youtube.platformmakers.org
// Using playwright-stealth to test admin login and settings

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

async function testAdminFunctionality() {
    console.log('🚀 Starting admin functionality test...');
    
    // Launch browser with stealth mode
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 // Slow down for observation
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    try {
        // Step 1: Navigate to the main site
        console.log('📍 Step 1: Navigating to https://youtube.platformmakers.org');
        await page.goto('https://youtube.platformmakers.org', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-screenshots/01-homepage.png' });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        // Step 2: Look for and click login button
        console.log('🔍 Step 2: Looking for login button');
        const loginButton = await page.locator('button:has-text("로그인"), button:has-text("Login"), a:has-text("로그인"), a:has-text("Login")').first();
        
        if (await loginButton.count() > 0) {
            console.log('✅ Login button found, clicking...');
            await loginButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-screenshots/02-login-page.png' });
        } else {
            console.log('❌ Login button not found, checking page elements...');
            const allButtons = await page.locator('button').all();
            const allLinks = await page.locator('a').all();
            
            console.log(`Found ${allButtons.length} buttons and ${allLinks.length} links`);
            for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
                const text = await allButtons[i].textContent();
                console.log(`Button ${i}: "${text}"`);
            }
        }
        
        // Step 3: Fill in admin credentials
        console.log('📝 Step 3: Filling in admin credentials');
        
        // Look for phone number input
        const phoneInput = await page.locator('input[type="tel"], input[placeholder*="전화"], input[placeholder*="phone"], input[name*="phone"]').first();
        if (await phoneInput.count() > 0) {
            await phoneInput.fill('01034424668');
            console.log('✅ Phone number entered: 01034424668');
        }
        
        // Look for password input
        const passwordInput = await page.locator('input[type="password"], input[name*="password"]').first();
        if (await passwordInput.count() > 0) {
            await passwordInput.fill('admin1234');
            console.log('✅ Password entered: admin1234');
        }
        
        // Look for submit button
        const submitButton = await page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();
        if (await submitButton.count() > 0) {
            await submitButton.click();
            console.log('✅ Login submitted');
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'test-screenshots/03-after-login.png' });
        }
        
        // Step 4: Navigate to Settings page
        console.log('⚙️ Step 4: Looking for Settings/Settings menu');
        await page.waitForTimeout(2000);
        
        // Look for settings link in navigation
        const settingsLink = await page.locator('a:has-text("설정"), a:has-text("Settings"), button:has-text("설정"), button:has-text("Settings")').first();
        if (await settingsLink.count() > 0) {
            await settingsLink.click();
            console.log('✅ Settings page accessed');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-screenshots/04-settings-page.png' });
        } else {
            console.log('❌ Settings link not found, checking sidebar/menu...');
        }
        
        // Step 5: Check for "시스템 프롬프트" in sidebar
        console.log('🔍 Step 5: Checking for "시스템 프롬프트" menu in sidebar');
        const systemPromptMenu = await page.locator('*:has-text("시스템 프롬프트"), *:has-text("System Prompt")').first();
        
        if (await systemPromptMenu.count() > 0) {
            console.log('✅ "시스템 프롬프트" menu found!');
            await systemPromptMenu.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-screenshots/05-system-prompt-menu.png' });
        } else {
            console.log('❌ "시스템 프롬프트" menu not found');
            
            // Check all sidebar items
            const sidebarItems = await page.locator('nav a, .sidebar a, .menu a').all();
            console.log('Available sidebar/menu items:');
            for (let i = 0; i < sidebarItems.length; i++) {
                const text = await sidebarItems[i].textContent();
                console.log(`- "${text}"`);
            }
        }
        
        // Step 6: Try to change preferences (toggle switches) and save
        console.log('🔧 Step 6: Looking for toggle switches and preferences');
        
        const toggleSwitches = await page.locator('input[type="checkbox"], .switch, .toggle').all();
        console.log(`Found ${toggleSwitches.length} toggle switches`);
        
        if (toggleSwitches.length > 0) {
            // Toggle the first switch
            await toggleSwitches[0].click();
            console.log('✅ Toggled first switch');
            await page.waitForTimeout(1000);
            
            // Look for save button
            const saveButton = await page.locator('button:has-text("저장"), button:has-text("Save")').first();
            if (await saveButton.count() > 0) {
                await saveButton.click();
                console.log('✅ Save button clicked');
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'test-screenshots/06-after-save.png' });
            } else {
                console.log('❌ Save button not found');
            }
        }
        
        // Step 7: Final screenshot and summary
        await page.screenshot({ path: 'test-screenshots/07-final-state.png' });
        console.log('📸 All screenshots saved in test-screenshots/ directory');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'test-screenshots/error-state.png' });
    } finally {
        await browser.close();
        console.log('🏁 Test completed');
    }
}

// Export function for use
module.exports = { testAdminFunctionality };

// Run if called directly
if (require.main === module) {
    testAdminFunctionality().catch(console.error);
}