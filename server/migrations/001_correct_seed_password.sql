-- Run once only for databases initialized with the old demo hash.
UPDATE users SET password = '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu' WHERE password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
