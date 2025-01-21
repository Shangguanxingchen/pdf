一、接口对接
使用url的query传参
参数一：pdf：文件名 -必传
参数二：userid：水印文字 -必传 -aes加密
key = "0F57136741CC46C49612942E093E7711"
iv = "HQti4TAfQIU08GME"
Mode = CBC,
Padding = Pkcs7
参数三：title: 文件的title -选传
参数四：keyword: 高亮的关键词 -选传
  例如：
  keyword=出口对就业拉动 -纯文本类型
  keyword=5592811_1782086423080472576_0 -pid类型
完整url示例：
http://10.5.113.80:9005/pdfview2/?pdf=1729740071705391104.pdf&userid=56NOE6vGSfzQPzDuGA6LJqxfNO/Zg0fb+KubAIeH9zQ=&title=关于修订《华夏基金管理有限公司员工培训管理办法》的通知&keyword=5592811_1782086423080472576_0
二、技术主要实现
1、前端从浏览器地址中获取必要的参数，比如关键词等
      const url = window.location.href
      const newUrl = new URL(url.replace(/\+/g, '%2B'))
      const pdfFileName = newUrl.searchParams.get('pdf')
      const origin = newUrl.origin
      this.userid = decrypt(newUrl.searchParams.get('userid'))
      this.title = newUrl.searchParams.get('title')
      this.keyword = newUrl.searchParams.get('keyword')
注意事项：目前浏览器会把符号“+”转义成空格，所以要把+提前替换成“%2B”
2、为了避免pdf文档以图片形式展示，所以通过iframe嵌套展示，但是要对传递的关键词进行encodeURIComponent编码
<iframe :src="src" frameborder="0" width="100%" height="100%" id="pdf-view"></iframe>

this.src = web/viewer.html?keyword=' + encodeURIComponent(this.keyword) + '&file=' + res.url
3、从pid获取关键词，如果文字太长，截取前500个字符
getKeywordFromPid(origin,query).then(response => {
              this.loading = false
                let resResult = JSON.parse(response)
                let queryText = ""
                if(resResult.length) {
                  queryText = resResult[0].content
                  if(queryText.length > 500) {
                    queryText = queryText.slice(0,500)
                  }
                }
                this.src = '/pdfview2/pdfjs-3.10.111-dist/web/viewer.html?keyword=' + encodeURIComponent(queryText) + '&file=' + res.url
                document.title = this.title

4、获取关键词，传递到高亮搜索输入框，支持多个关键词及匹配不上的时候适当缩短关键词
    initializeKeywordHighlight();
  
    function initializeKeywordHighlight() {
      var url = decodeURIComponent(window.location.search).replace(/\+/g, '%2B');
      var params = new URLSearchParams(url, false);
      var page = params.get('page') || '1';
      var keyword = params.get('keyword');
  
      if (keyword) {
        document.getElementById("findInput").value = keyword;
        highlightKeywords(keyword);
      }
    }
  
    function highlightKeywords(keyword) {
      const keywords = keyword.split("|||");
      let matchedKeywords = [];
  
      const processKeywords = (index) => {
        if (index >= keywords.length) {
          applyHighlights(matchedKeywords);
          return;
        }
  
        trySingleKeyword(keywords[index], (matchedKeyword) => {
          if (matchedKeyword) {
            matchedKeywords.push(matchedKeyword);
          }
          processKeywords(index + 1);
        });
      };
  
      processKeywords(0);
    }
  
    function trySingleKeyword(keyword, callback) {
      document.getElementById("findInput").value = keyword;
      findHighlightAllClick();
      findHighlightAllClick();
  
      setTimeout(() => {
        const matchStatus = document.getElementById("findInput").getAttribute("data-status");
        const findResultsCount = document.getElementById("findResultsCount").innerText;
        // 找到的匹配项个数
        const matchCount = getSecondNumber(findResultsCount);
  
        if (matchStatus === "notFound" || matchCount === 0) {
          // 如果没有匹配，尝试逐步缩短关键词
          if (keyword.length > 1) {
            trySingleKeyword(keyword.slice(0, Math.ceil(keyword.length / 2)), callback);
          } else {
            callback(null);
          }
        } else {
          callback(keyword);
        }
      }, 1000);
    }
  
    function applyHighlights(keywords) {
      document.getElementById("findInput").value = keywords.join("|||");
      findHighlightAllClick();
    }
  
  
    function findHighlightAllClick() {
      document.getElementById("findHighlightAll").click();
    }
  
    function getSecondNumber(str) {
      const matches = str.match(/\d+/g);
      return matches && matches.length >= 2 ? parseInt(matches[1]) : 0;
    }
    // //跳转至指定页码
    // document.getElementById('pageNumber').value = page*1;
    // //nextpage,需要激活下一页按钮，否则第一次可以跳转到指定页，但是第二次访问时，还是跳到上一次的页码
    // this.pdfViewer.currentPageNumber = page*1;      
    // document.getElementById("nextpage").click();


5、通过正则匹配关键词
分割所有的关键词，之间添加空格；
转义在正则表达式中有特殊含义的元字符，给左右两边添加0到多个空格匹配任何 Unicode 标点符号字符，给左右两边添加0到多个空格
匹配一个或多个空白字符,包括空格、制表符、换行符等
convertToRegExpString(query, hasDiacritics) {
    const {
      matchDiacritics
    } = this.#state;
    let isUnicode = false;
    //多个关键词开始
    if(query.includes("|||")) {
      let processedQueries = [];
      let queries = query.split("|||")
      queries.forEach(query => {
        query = query.split("").join(" ");
        query = query.replaceAll(SPECIAL_CHARS_REG_EXP, (match, p1, p2, p3, p4, p5) => {
          if (p1) {
            return `[ ]*\\${p1}[ ]*`;
          }
          if (p2) {
            return `[ ]*${p2}[ ]*`;
          }
          if (p3) {
            return "[ ]*";
          }
          if (matchDiacritics) {
            return p4 || p5;
          }
          if (p4) {
            return DIACRITICS_EXCEPTION.has(p4.charCodeAt(0)) ? p4 : "";
          }
          if (hasDiacritics) {
            isUnicode = true;
            return `${p5}\\p{M}*`;
          }
          return p5;
        });

        const trailingSpaces = "[ ]*";
        if (query.endsWith(trailingSpaces)) {
          query = query.slice(0, query.length - trailingSpaces.length);
        }

        if (matchDiacritics && hasDiacritics) {
          DIACRITICS_EXCEPTION_STR ||= String.fromCharCode(...DIACRITICS_EXCEPTION);
          isUnicode = true;
          query = `${query}(?=[${DIACRITICS_EXCEPTION_STR}]|[^\\p{M}]|$)`;
        }

        processedQueries.push(query);
      });

      let combinedQuery = processedQueries.join("|"); // 匹配任意一个关键词
      // let combinedQuery = processedQueries.map(q => `(?=.*${q})`).join(""); // 匹配所有关键词
      return [isUnicode, combinedQuery];
    }
    //多个关键词结束
    
    // 新增把每一个字符中间都加上空格[ ]*
    query= query.split("").join(" ")
    // 结束
    query = query.replaceAll(SPECIAL_CHARS_REG_EXP, (match, p1, p2, p3, p4, p5) => {
      if (p1) {
        return `[ ]*\\${p1}[ ]*`;
      }
      if (p2) {
        return `[ ]*${p2}[ ]*`;
      }
      // if (p3) {
      //   return "[ ]+";
      // }
      if (p3) {
        return "[ ]*";
      }
      if (matchDiacritics) {
        return p4 || p5;
      }
      if (p4) {
        return DIACRITICS_EXCEPTION.has(p4.charCodeAt(0)) ? p4 : "";
      }
      if (hasDiacritics) {
        isUnicode = true;
        return `${p5}\\p{M}*`;
      }
      return p5;
    });
    const trailingSpaces = "[ ]*";
    if (query.endsWith(trailingSpaces)) {
      query = query.slice(0, query.length - trailingSpaces.length);
    }
    if (matchDiacritics) {
      if (hasDiacritics) {
        DIACRITICS_EXCEPTION_STR ||= String.fromCharCode(...DIACRITICS_EXCEPTION);
        isUnicode = true;
        query = `${query}(?=[${DIACRITICS_EXCEPTION_STR}]|[^\\p{M}]|$)`;
      }
    }
    
    return [isUnicode, query];
  }
6、根据正则匹配查找，返回关键词位置信息
calculateRegExpMatch(query, entireWord, pageIndex, pageContent) {
    const matches = this._pageMatches[pageIndex] = [];
    const matchesLength = this._pageMatchesLength[pageIndex] = [];
    if (!query) {
      return;
    }
    const diffs = this._pageDiffs[pageIndex];
    let match;
    while ((match = query.exec(pageContent)) !== null) {
      if (entireWord && !this.#isEntireWord(pageContent, match.index, match[0].length)) {
        continue;
      }

      const [matchPos, matchLen] = getOriginalIndex(diffs, match.index, match[0].length);
      if (matchLen) {
        matches.push(matchPos);
        matchesLength.push(matchLen);
      }
    }
  }

