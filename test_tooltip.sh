sed -i 's/<div className="flex flex-col animate-fade-in-up w-full">/<div className="absolute bottom-full mb-1 left-1\/2 -translate-x-1\/2 z-50 animate-fade-in-up">/g' src/App.tsx
sed -i 's/className="mt-1.5 flex items-center overflow-x-auto hide-scrollbar"/className="flex items-center overflow-x-auto hide-scrollbar shadow-lg rounded-full backdrop-blur-md"/g' src/App.tsx
