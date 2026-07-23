const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Revert the wrong replacement at the book dropdown:
const wrongEnd = `                      </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Chapter Selector Dropdown */}`;

const correctEnd = `                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Chapter Selector Dropdown */}`;

content = content.replace(wrongEnd, correctEnd);

// Find the correct place to add </>. The old sidebar is around 2840.
// Look for FLOAT POP TRIGGERS WHEN HEADER COLLAPSED
const sidebarEndRegex = /                      <\/motion\.div>\n                    \)\}\n                  <\/AnimatePresence>\n                <\/div>\n              <\/div>\n\n            <\/div>\n          <\/motion\.header>\n        \)\}\n      <\/AnimatePresence>\n\n      \{\/\* FLOAT POP TRIGGERS/;

const match = content.match(sidebarEndRegex);
if (match) {
    const fixedSidebarEnd = match[0].replace(
        `                      </motion.div>\n                    )}\n                  </AnimatePresence>`,
        `                      </motion.div>\n                      </>\n                    )}\n                  </AnimatePresence>`
    );
    content = content.replace(match[0], fixedSidebarEnd);
    fs.writeFileSync('src/App.tsx', content);
    console.log('Fixed tags');
} else {
    console.log('Could not find sidebar end regex');
}

