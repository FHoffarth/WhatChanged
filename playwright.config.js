import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'browser.spec.js',workers:1,reporter:'list',use:{channel:'chrome',headless:true,baseURL:'http://127.0.0.1:48173'},webServer:{command:'npm exec vite -- preview --host 127.0.0.1 --port 48173 --strictPort',url:'http://127.0.0.1:48173',reuseExistingServer:false}});
