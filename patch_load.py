with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add dual-stream-column class to all four column containers
# They all share the same class pattern prefix
old = 'w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth'
new = 'dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth'

count = code.count(old)
print(f"Found {count} column containers to add dual-stream-column class")

code = code.replace(old, new)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done!")
