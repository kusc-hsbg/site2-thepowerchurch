
var POST = function(){
	var code, post_body, body_input, is_notice,is_notice_input,is_secret,is_secret_input, post_form,post_subject,total_file_size;

	var $board_container,$floara_obj;
	var $post_img_library;
	var $represent_img;
	var $upload_cover_image_btn_obj, $delete_cover_image_btn_obj, $cover_image, $cover_image_tmp_no;
	var $post_secret_password;
	var $widget_wrap,board_code,listing_type,more_list_page;
	var $listing_obj,type_data;
	var option = {};
	var category_list;
	var board_data;
	var sent = false;
	var isIOS, isSafari, $fr_m_custom, $write_header, m_sticky_container_trigger_top, $toolbarContainer;

	var reaction_token, reaction_token_key;

	// macOS Chrome에서 게시물 본문의 '큰 이미지'를 드래그하면 즉시 취소되는(잡자마자 놓아지는) 문제 우회.
	// 원인: macOS 크롬은 드래그 시 마우스를 따라다니는 미리보기(드래그 고스트)를 '화면에 펼친 실제 픽셀 크기'
	//       기준으로 만드는데, 펼친 그림이 너무 크면 미리보기 생성에 실패하고 드래그 자체를 취소한다.
	//       (Windows/Safari는 정상. 파일 용량이 아니라 가로x세로 픽셀 크기가 기준)
	// 해결: 드래그 시작(dragstart) 시 가로 최대 120px짜리 작은 캔버스를 만들어 setDragImage로 지정 →
	//       크롬이 무거운 원본으로 미리보기를 만들지 않게 하여 드래그가 취소되지 않는다.
	//       (본문 원본 이미지 화질은 그대로, 드래그 중 따라다니는 미리보기만 축소)
	var __macDragFixAttached = false;
	var setupMacChromeImageDragFix = function(){
		var ua = navigator.userAgent;
		var isMacChrome = ua.indexOf('Macintosh') !== -1 && ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg/') === -1 && ua.indexOf('OPR/') === -1;
		if(!isMacChrome || __macDragFixAttached) return;
		__macDragFixAttached = true;

		document.addEventListener('dragstart', function(ev){
			var target = ev.target;
			if(!target || target.tagName !== 'IMG') return;
			var dt = ev.dataTransfer;
			if(!dt) return;
			var maxW = 120;
			var ratio = target.naturalWidth > 0 ? Math.min(1, maxW / target.naturalWidth) : 1;
			var w = Math.max(1, Math.round((target.naturalWidth || target.width) * ratio));
			var h = Math.max(1, Math.round((target.naturalHeight || target.height) * ratio));
			var canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			var ctx = canvas.getContext('2d');
			if(!ctx) return;
			try {
				ctx.drawImage(target, 0, 0, w, h);
			} catch(e){
				// CORS 등으로 그리기 실패 시 회색 박스로 대체 (드래그 자체는 성립시킴)
				ctx.fillStyle = 'rgba(0,0,0,0.3)';
				ctx.fillRect(0, 0, w, h);
			}
			canvas.style.position = 'fixed';
			canvas.style.top = '-1000px';
			canvas.style.left = '-1000px';
			canvas.style.pointerEvents = 'none';
			document.body.appendChild(canvas);
			try {
				dt.setDragImage(canvas, Math.round(w / 2), Math.round(h / 2));
			} catch(e){ /* setDragImage 미지원 시 무시 */ }
			setTimeout(function(){
				if(canvas.parentNode) canvas.parentNode.removeChild(canvas);
			}, 0);
		}, true);
	};

	var postDeletePost = function (board_code,code,return_url,secret_pass){
		if(confirm(LOCALIZE.설명_삭제하시겠습니까())){
			$.ajax({
				type		: 'post',
				data:{'pcode':code,board_code:board_code,secret_pass:secret_pass},
				url			: '/ajax/deletePost.cm',
				dataType 	: 'json',
				success		: function(result){
					if(result.msg == 'SUCCESS'){
						window.location.href = return_url;
					}else{
						alert(result.msg);
					}
				}
			});
		}
	};


	/***
	 * 안드로이드앱에서 post글쓰기시 이미지 업로드 완료시 처리
	 * @param image
	 */

	var $image_list_obj = {};
	//이미지 임시저장 리스트 추가
	if(!($image_list_obj.length > 0)) {
		var image_list_html = $("<ul id='image_list' style='display: none'></ul>");
		$("body form").append(image_list_html);
		$image_list_obj = image_list_html;
	}

	var android_que = [];
	var androidAppPostImageUploadComplete = function(image){
		if(image.tmp_idx > 0){
			android_que.push(image);
			if(image.is_last == "Y") androidAppPostImageUploadAllComplete();
		}
	};

	var androidAppPostImageUploadAllComplete = function(){
		androidAppPostImageInsert(android_que[0]);
	};

	var androidAppPostImageInsert = function(image){
			FroalaEditor('#post_body').image.insert(CDN_UPLOAD_URL + image.url, true);
	};

	var postAddImage = function(tmp_idx,size){
		var uniq_id = makeUniq('image_');
		var hidden_input = $('<input name="temp_images[]" value="' + tmp_idx + '" type="hidden" />');
		var li 	= $('<li>').attr('id',uniq_id).data({'item':uniq_id,size:size});
		li.append(hidden_input);
		$image_list_obj.append(li);
	};





	var postInitWrite = function(key,data, str_category){
		$("body").addClass("write_mode");
		$board_container = $('#board_container');
		post_body = $('#post_body');
		post_subject = $('#post_subject');
		body_input = $('#body_input');
		post_form = $('#post_form');
		$upload_cover_image_btn_obj = $('._upload_cover_image');
		$delete_cover_image_btn_obj = $('._delete_cover_image');
		$cover_image = $('#cover_image');
		$cover_image_tmp_no = $('#cover_image_tmp_no');
		code = key;
		board_data = data;
		total_file_size = 0;
		category_list = categoryList(str_category);
		if(IE_VERSION < 10){
			CKEDITOR.replace( 'post_body',{
				filebrowserImageUploadUrl: '/ajax/post_image_upload.cm?board_code='+key
			});
		}else{
			if(android_version() == 4){
				post_body.addClass('legacy_webview');
			}
			var placeholder = board_data.placeholder_edit;
			if(placeholder == '') placeholder = getLocalizeString('설명_내용을_입력해주세요', '', '내용을 입력해주세요');
      setFroala('#post_body', {
        'code' : code,
        'image_upload_url' : "/ajax/post_image_upload.cm",
        'file_upload_url' : "/ajax/post_file_upload.cm",
        'file_list_obj' : $("#file_list"),
        'placeholderText' : placeholder,
        'image_display' : 'inline',
        'mobile_custom' : true
      }, {
        'image.inserted' : function($img, response){
          if(IS_ANDROID_APP == 'Y'){
            var img = post_body.find('img[src="' + CDN_UPLOAD_URL + image.url + '"]');
            img.data(image);
            postAddImage(image.tmp_idx, image.size);
            android_que.splice(0, 1);
            if(android_que.length > 0) androidAppPostImageUploadAllComplete();
          }
        }
      });
      setupMacChromeImageDragFix();
		}

		function dataURLtoBlob(dataurl) {
			var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
				bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
			while(n--){
				u8arr[n] = bstr.charCodeAt(n);
			}
			return new Blob([u8arr], {type:mime});
		}

		$delete_cover_image_btn_obj.on('click',function(){
			POST.deleteCoverImage();
		});

		$upload_cover_image_btn_obj.setUploadImage({
			url : '/ajax/upload_image.cm',
			formData : {target : 'post', 'temp' : 'Y', 'param_name' : 'cover_image'}
		}, function (msg, data,res) {
			$.each(res.cover_image,function(i,file){
				if(file.tmp_idx > 0){
					$cover_image.val(CDN_UPLOAD_URL+file.url);
					$cover_image_tmp_no.val(file.tmp_idx);
					$delete_cover_image_btn_obj.show();
					$board_container.toggleClass('bg_on',true);
					$board_container.find('._cover_image').css('background-image',"url("+CDN_UPLOAD_URL+file.url+")");
					$board_container.find('._cover_image_src').attr('src',CDN_UPLOAD_URL+file.url);
				}
			});
		});

		isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
		isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
		$fr_m_custom = $board_container.find('._fr-m-custom');
		$write_header = $board_container.find('._write_header');
		m_sticky_container_trigger_top = $fr_m_custom.offset().top;
		$toolbarContainer = $fr_m_custom.find('#toolbarContainer');
		if(isIOS && isSafari){
			$write_header.css('position', 'absolute');
		}
		var timeoutTime = isIOS && isSafari ? 100 : 10;
		var resize_time;
		resizeStickyContainer();
		$(window).off('scroll.mobile_write resize.mobile_write').on('scroll.mobile_write resize.mobile_write',function(){
			var s_top = $(this).scrollTop();
			if(isIOS && isSafari){
				$write_header.css({'-webkit-transition': 'none', 'transition': 'none', 'top': 0});
				if(s_top > m_sticky_container_trigger_top){
					$toolbarContainer.css({'-webkit-transition': 'none', 'transition': 'none', 'top': 0});
				}
			}
			if(resize_time) {
				clearTimeout(resize_time);
			}
			resize_time = setTimeout(function() {
				resizeStickyContainer();
			}, timeoutTime);
		});

		// $(window).bind('beforeunload', function(){
		// 	return LOCALIZE.설명_페이지를벗어나시겠습니까();
		// });
		var $_mobile_tool_bar = $('._mobile_tool_bar');
		if($_mobile_tool_bar.find('._tool_btn:visible').length === 0){
			$_mobile_tool_bar.hide();
		}
	};

	function resizeStickyContainer(){
		var s_top = $(this).scrollTop();
		if(isIOS && isSafari){
			$write_header.css({'-webkit-transition': 'top 100ms', 'transition': 'top 100ms', 'top': s_top + 'px'});
			$fr_m_custom.toggleClass('m_sticky_container', s_top > m_sticky_container_trigger_top);
			$fr_m_custom.toggleClass('m_sticky_container_ios', s_top > m_sticky_container_trigger_top);
			if(s_top > m_sticky_container_trigger_top){
				$toolbarContainer.css({'-webkit-transition': 'top 100ms', 'transition': 'top 100ms', 'top': s_top + 'px'});
				post_body.css('padding-top', '50px');
			}else{
				$toolbarContainer.css({'-webkit-transition': 'none', 'transition': 'none', 'top': 'auto'});
				post_body.css('padding-top', '50px');
			}
		}else{
			$fr_m_custom.toggleClass('m_sticky_container', s_top > m_sticky_container_trigger_top);
		}
		if($(window).width() >= 768){
			if($board_container.hasClass('bg_on'))
				$board_container.find('#toolbarContainer').toggleClass('pc_sticky_toolbar', s_top > 487);
			else
				$board_container.find('#toolbarContainer').toggleClass('pc_sticky_toolbar', s_top > 180);
		}
	}

	var deleteCoverImage = function(){
		$cover_image.val('');
		$cover_image_tmp_no.val('');
		$board_container.toggleClass('bg_on',false);
		$board_container.find('._cover_image').css('background-image','none');
		$board_container.find('._cover_image_src').attr('src','');
		$delete_cover_image_btn_obj.hide();
	};


	const setPostToken = async () => {
		await $.ajax({
			type: 'post',
			url: '/set_post_client_token.cm',
			dataType: 'json',
			async : false
		});
	};

	var postSubmit = async function(){
		if(sent) return false;
		await setPostToken(); // 토큰주입API호출

		if(IE_VERSION < 10){
			var body = CKEDITOR.instances.post_body.getData();
			body_input.val(body);
			post_form.submit();
		}else{
      if(post_body.hasClass('fr-code-view'))
        FroalaEditor('#post_body').codeView.toggle();
      var body = FroalaEditor('#post_body').html.get(true);

			body_input.val(body);
			post_form.submit();
		}
		sent = true;
	};

	var endSubmit = function(msg){
		sent = false;
		alert(msg);
	};

	// ── 요구형 문자 캡차 — 서버가 애매한 스팸 점수(0.50 이상·임계 미만)에서 요구한다 ──────
	// 댓글 경로(`post_comment.js`)와 **같은 규칙·같은 모양**이다. 다른 점은 하나: 글쓰기 폼은
	// hidden iframe 으로 제출되어(:185 `target="hidden_frame"`) 부모 창이 서버 응답을 직접 받지
	// 못한다. 그래서 서버가 iframe 안에서 `parent.POST.showBandCaptcha(...)` 를 부르고, 이 창이
	// 그 함수를 제공한다 — **구버전 JS(이 함수가 없는 부모 문서)와 섞여도** 서버가 typeof 로
	// 갈라 기존 submit_error 경로로 떨어진다(`post_add.cm` 의 catch 뒤 분기).
	//
	// 입력칸 이름(captcha_key·captcha_answer)은 서버가 그리는 사이트 캡차와 **같다**. 블록은
	// 반드시 폼 **안**에 있어야 한다 — 네이티브 form.submit() 이 폼 필드를 그대로 실어 보내므로,
	// 폼 밖에 그리면 캡차 답이 서버에 도착하지 않는다.
	var CAPTCHA_CHALLENGE_ATTR = 'data-fo-captcha-challenge';

	// 사이트 캡차 화면(site_ui.cls)이 쓰는 새로고침 아이콘과 같은 모양이다.
	var CAPTCHA_CHALLENGE_REFRESH_ICON = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">'
		+ '<path d="M1 0.5H27C27.2761 0.5 27.5 0.723857 27.5 1V27C27.5 27.2761 27.2761 27.5 27 27.5H1C0.723858 27.5 0.5 27.2761 0.5 27V1C0.5 0.723858 0.723857 0.5 1 0.5Z" fill="white"/>'
		+ '<path d="M1 0.5H27C27.2761 0.5 27.5 0.723857 27.5 1V27C27.5 27.2761 27.2761 27.5 27 27.5H1C0.723858 27.5 0.5 27.2761 0.5 27V1C0.5 0.723858 0.723857 0.5 1 0.5Z" stroke="#BCC0C6"/>'
		+ '<path d="M15.3333 7.3335C15.3333 7.3335 15.8995 7.41438 18.2426 9.75752C20.5858 12.1007 20.5858 15.8997 18.2426 18.2428C17.4125 19.073 16.3995 19.609 15.3333 19.8509M15.3333 7.3335L19.3333 7.3335M15.3333 7.3335L15.3333 11.3335M12.6667 20.6667C12.6667 20.6667 12.1005 20.5858 9.75736 18.2427C7.41421 15.8995 7.41421 12.1005 9.75736 9.75739C10.5875 8.92721 11.6005 8.39116 12.6667 8.14925M12.6667 20.6667L8.66667 20.6668M12.6667 20.6667L12.6667 16.6668" stroke="#4B515B" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
		+ '</svg>';

	// 이 창의 글쓰기 폼. `POST.init` 이전(다른 화면)에는 없으므로 그때는 빈 집합이다.
	var captchaChallengeForm = function(){
		return (post_form && post_form.length > 0) ? post_form : $('#post_form');
	};

	// 그 폼의 요구 블록(없으면 빈 jQuery). 폼마다 하나만 만든다.
	var captchaChallengeBlock = function(form){
		return form.find('[' + CAPTCHA_CHALLENGE_ATTR + ']');
	};

	var createCaptchaChallengeBlock = function(){
		var block = $('<div class="captcha_block" ' + CAPTCHA_CHALLENGE_ATTR + '="1" style="display: none;"></div>');
		var row = $('<div style="display: flex; align-items: center;"></div>');
		var holder = $('<div style="display: inline-flex; align-items: center; gap: 8px; margin-right: 16px;"></div>');
		var refresh = $('<div class="_captcha_challenge_refresh" style="cursor: pointer; width: 28px; height: 28px;"></div>');

		refresh.html(CAPTCHA_CHALLENGE_REFRESH_ICON);
		holder.append($('<img width="113" height="30" alt="" />')).append(refresh);
		row.append(holder)
			.append('<input type="hidden" name="captcha_key" />')
			.append('<input type="text" name="captcha_answer" class="capcha_input" />');
		block.append(row).append('<span class="captcha_description"></span>');

		// 문구는 기존 LOCALIZE 키를 그대로 쓴다(새 키를 만들지 않는다). 값은 **속성·텍스트로**
		// 넣는다 — 문자열 조합으로 HTML 에 끼우면 현지화 문구가 마크업을 흔들 수 있다.
		block.find('input[name="captcha_answer"]').attr('placeholder', getLocalizeString('설명_보안문자입력', '', '보안 문자를 입력해 주세요.'));
		block.find('.captcha_description').text(getLocalizeString('설명_공백없이입력대소문자구분', '', '공백 없이 입력해 주세요. 대소문자를 구분합니다.'));

		return block;
	};

	// 캡차 블록을 폼에 붙인다.
	//
	// 자리 — `.editor_box`(작성자 요약 아래·제목·에디터를 묶은 상자)의 **첫 자식**. 그 상자가
	// 없는 스킨이면 폼 맨 앞으로 폴백한다(둘 다 폼 **안**이다: 답이 제출에 실리는 조건은 같다).
	//
	// **바깥이 아니라 안**인 이유(실측): 이 스킨은 fixed 헤더 높이만큼의 상단 여백을
	// `.editor_box` 에 준다. 그 앞에 형제로 넣으면 그 여백을 받지 못해 블록이 문서 최상단에
	// 깔리고 헤더가 그 위를 덮는다 — 모바일에서는 폼이 뷰포트보다 짧아 스크롤도 없어
	// 사용자가 캡차를 **볼 수 없었다**(390폭 실측). 안에 넣으면 같은 여백을 물려받는다.
	var attachCaptchaChallengeBlock = function(form, block){
		var editor_box = form.find('.editor_box').first();

		if (editor_box.length > 0) {
			editor_box.prepend(block);
		} else {
			form.prepend(block);
		}
	};

	// 블록이 화면 밖이면 그쪽으로 스크롤한다 — 캡차를 요구하면서 보이지 않으면 풀 수 없다.
	// 이미 보이면 아무것도 하지 않는다(새로고침마다 화면이 튀지 않게).
	// 스크롤 API 가 없는 환경(구형 웹뷰·하네스 대역)에서는 조용히 지나간다 — 관측이 아니라
	// 편의 기능이라, 없다고 등록이 막히면 안 된다.
	var captchaChallengeScrollIntoViewIfNeeded = function(block){
		var node = block.get(0);

		if (!node || typeof node.getBoundingClientRect !== 'function') return;

		var rect = node.getBoundingClientRect();

		if (!rect || typeof rect.top !== 'number' || typeof rect.bottom !== 'number') return;

		var viewport_height = window.innerHeight || 0;

		if (rect.top < 0 || rect.bottom > viewport_height) {
			if (typeof node.scrollIntoView === 'function') {
				node.scrollIntoView({block: 'center'});
			}
		}
	};

	var applyCaptchaChallenge = function(result){
		var form = captchaChallengeForm();

		// 그릴 수 없는 응답이면 문구만 남는다(등록을 막지 않는다 — 서버가 저장 여부를 정한다).
		// 이미지 키 이름은 요구 응답(iframe 스크립트)과 새로고침 응답이 **같다**(`captcha_img`).
		if (form.length === 0 || !result || !result.captcha_img || !result.key) return;

		var block = captchaChallengeBlock(form);

		if (block.length === 0) {
			block = createCaptchaChallengeBlock();
			block.find('._captcha_challenge_refresh').on('click', function(){
				refreshCaptchaChallenge();
			});
			// 헤더 아래 첫 영역 앞에 넣는다 — 그 상자가 없는 스킨이면 폼 맨 앞으로 폴백한다
			// (둘 다 폼 **안**이다: 캡차 답이 폼 제출에 실리는 조건은 그대로다).
			attachCaptchaChallengeBlock(form, block);
		}

		block.find('img').attr('src', result.captcha_img);
		block.find('input[name="captcha_key"]').val(result.key);
		block.find('input[name="captcha_answer"]').val('');
		block.css('display', 'flex');

		captchaChallengeScrollIntoViewIfNeeded(block);
	};

	// 새로고침 — **발급 전용 엔드포인트**로 새 이미지·키만 받는다.
	//
	// 글 등록 경로(post_add.cm)를 다시 태우면 안 된다: 그 요청은 판정·게이트를 다시 태우고,
	// **본문·제목이 그대로 저장되어 실제로 글이 올라간다** — 사용자는 캡차만 새로 받으려 했다.
	// 그래서 폼을 직렬화해 보내지 않는다(그 자체가 저장 요청의 재료다). 서버는 이 키의 결속
	// 표식을 선점(DEL)한 요청에만 새 캡차를 발급한다.
	var refreshCaptchaChallenge = function(){
		var form = captchaChallengeForm();
		var block = captchaChallengeBlock(form);
		if (form.length === 0 || block.length === 0) return;

		$.ajax({
			type:'post',
			data:{
				'captcha_key': block.find('input[name="captcha_key"]').val(),
				'target': 'post',
				'band_captcha': '1'
			},
			url:'/ajax/refresh_captcha.cm',
			dataType:'json',
			success:function(result){
				if (result.msg == 'SUCCESS') {
					// 새 이미지·새 키를 그대로 반영한다(입력칸은 비운다).
					applyCaptchaChallenge(result);
				} else {
					alert(result.msg);
				}
			}
		});
	};

	// 부모 창에 캡차를 띄우는 함수 — **iframe 안의 서버 스크립트가 부른다**(post_add.cm).
	// 문구는 기존 경로(submit_error)와 **같은 alert** 로 띄운다: 캡차를 그리지 못하는 응답이면
	// 지금까지와 같이 문구만 보이고, 사용자는 다시 눌러 새 요구를 받는다.
	var showBandCaptcha = function(data){
		applyCaptchaChallenge(data);

		// 문구는 서버가 늘 실어 보낸다(기존 키 '설명_자동입력문자불일치'). 없는 응답이면
		// **빈 alert 를 띄우지 않고** 제출 잠금만 푼다 — 사용자는 다시 눌러 새 요구를 받는다.
		if (data && data.msg) {
			endSubmit(data.msg);
		} else {
			sent = false;
		}
	};

	var postCancel = function(back_url){
		if(isIOS && isSafari){
			var s_top = $(this).scrollTop();
			$write_header.css({'-webkit-transition': 'none', 'transition': 'none', 'position': 'fixed', 'top': 0});
			$fr_m_custom.toggleClass('m_sticky_container', s_top > m_sticky_container_trigger_top);
			$fr_m_custom.toggleClass('m_sticky_container_ios', s_top > m_sticky_container_trigger_top);
			if(s_top > m_sticky_container_trigger_top){
				$toolbarContainer.css({'-webkit-transition': 'none', 'transition': 'none', 'position': 'fixed', 'top': $write_header.height() + 'px'});
			}else{
				$toolbarContainer.css({'-webkit-transition': 'none', 'transition': 'none', 'top': 'auto'});
			}
		}
		document.location.href = back_url;
	};

	var is_more = true;
	var listing_obj = {};

	var postInitMoreList = function(wcode,bcode,type){
		listing_type = type;
		$widget_wrap = $("#"+wcode);
		board_code = bcode;
		more_list_page = 1;
		is_more = true;
		return true;
	};

	var toggleAlarmPopup = function(){
		var $alarm_popup = $('#alarm_popup');
		var $dLabel = $('#dLabel');
		$alarm_popup.toggleClass('open');
		if($alarm_popup.hasClass('open')){
			$(window).on('click.alarm_popup',function(event){
				var $top_closest = $(event.target).closest('a');
				if($top_closest.attr('id')!='dLabel'){
					var $closest = $(event.target).closest('ul');
					if($closest != null && !$closest.hasClass('dropdown-menu')){
						$alarm_popup.removeClass('open');
						$(window).off('click.alarm_popup');
						var alarm_group_list = $alarm_popup.find("input[type='checkbox']").is(":checked");
						if(alarm_group_list) $dLabel.addClass('active');
						else $dLabel.removeClass('active');
					}
				}
			});
		}
	};
	var postDeleteFile = function(id){
		var obj = $('#'+id);
		var size = obj.data('size');
		total_file_size -= size;
		obj.remove();
	};
	var postAddFile = function(filename,file_code,tmp_idx,size){
		var uniq_id = makeUniq('upfile_');
		total_file_size += size;
		var clear_ico = $('<i class="zmdi zmdi-close"></i>').data({'item':uniq_id,size:size}).click(function(e){
			postDeleteFile(uniq_id);
		});
		var hidden_input = '';
		if(file_code.length>0) {
			hidden_input = $('<input name="upload_files[]" value="' + file_code + '" type="hidden" />');
		}else if(Math.round(tmp_idx) > 0){
			hidden_input = $('<input name="temp_files[]" value="' + tmp_idx + '" type="hidden" />');
		}
		var li 	= $('<li>').attr('id',uniq_id).data({'item':uniq_id,size:size});
		// XSS 방지: 파일명은 HTML로 해석되지 않도록 text로 삽입 (KVE-2025-2806)
		var $file_name_dom = $('<span></span>');
		$file_name_dom.text(filename);
		$file_name_dom.append($('<em></em>').text(' ' + GetFileSize(size)));
		li.append($file_name_dom);
		li.append(clear_ico);
		li.append(hidden_input);
		$("#file_list").append(li);
	};

	var MovePostPopup = function(post_code,menu_url){
		$.ajax({
			type		: 'post',
			data:{'post_code':post_code,'menu_url':menu_url},
			url			: '/ajax/move_post_popup.cm',
			dataType 	: 'json',
			success		: function(result){
				if(result.msg == 'SUCCESS'){
					var html = $(result.html);
					$.cocoaDialog.open({type : 'site_alert', custom_popup : html});
				}else{
					alert(result.msg);
				}
			}
		});
	};

	/**
	 * 설정된 카테고리 생성
	 * @returns {Array}
	 */
	var categoryList = function(str_category){
		var b_data = board_data;
		var category_type_list_temp = [];
		var category_list_default = {};
		category_list_default.key = 0;
		category_list_default.value = str_category;
		category_type_list_temp.push(category_list_default);

		if(Array.isArray(b_data.category_list)){
			$.each(b_data.category_list, function(key, val){
				var category_list = {};
				var $name = val.name;
				var $color = val.color;
				category_list.key = key + 1;
				category_list.value = '<span style="color:' + $color + '">' + RemoveTag($name) + '</span>';
				category_type_list_temp.push(category_list);
			});
		}
		return category_type_list_temp;
	};

	/**
	 * 분류 리스트 출력
	 * @param $obj
	 * @param default_code
	 */
	var categoryTypeSelect = function($obj,default_code){
		$obj.find('._category_type_list').setSelectBox({
			option: category_list,
			'set' : {
				select_custom_cls:'category_select',
				custom_cls:'category_dropdown',
				width:180
			},
			'default' : default_code,
			change: function (o) {
				$('#category_type').val(o.key);
			}
		});
	};

	var viewReviewPostDetail = function(idx, board_code){
		$(function(){
		$.ajax({
			type : 'POST',
			data : {idx : idx, board_code : board_code},
			url : ('/ajax/review_post_detail_view.cm'),
			dataType : 'json',
			async : false,
			cache : false,
			success : function(res){
				if(res.msg === 'SUCCESS'){
					$.cocoaDialog.open({
						type : 'prod_detail review', custom_popup : res.html, width : 800});
					if(history.replaceState && history.pushState){
						// 모달 히스토리 커스텀(IE 10 이상)
						var current_url = location.href.indexOf('#') === -1 ? location.href : location.href.substr(0, location.href.indexOf('#'));
						var back_url = document.referrer.indexOf('#') === -1 ? document.referrer : document.referrer.substr(0, document.referrer.indexOf('#'));
						history.pushState(null, null, current_url);
						history.replaceState(null, null, current_url + "#prod_detail_review!/" + res.idx);
					}else{
						location.hash = "prod_detail_review!/" + res.idx;
					}
					$(window).off('hashchange').on('hashchange',function(){
						var hash_qna_spilt = location.hash.split('!/')[1];
						if(!hash_qna_spilt){
							$.cocoaDialog.close();
						}else{
							var hash_spilt_tab = location.hash.split('!/')[0];
							if(hash_spilt_tab === '#prod_detail_review'){
								viewReviewPostDetail(hash_qna_spilt,board_code);
							}else if(hash_spilt_tab === '#prod_detail_qna'){
								viewQnaPostDetail(hash_qna_spilt,board_code);
							}
						}
					});
					$('.modal_prod_detail').off('hidden.bs.modal').on('hidden.bs.modal', function (e) {
						removeReviewHash();
					});
				}else{
					alert(res.msg);
				}
			}
		});
		});
	};

	var removeReviewHash = function(){
		$(window).off('hashchange');
    $('html').toggleClass('modal-scroll-control', false);
		var hash_review_spilt = location.hash.split('!/')[1];
		if(hash_review_spilt){
			if(history.replaceState && history.pushState){
				history.back();
			}else{
				location.href = '#prod_detail_review';
			}
		}
	};

	var viewQnaPostDetail = function(idx, board_code){
		$(function(){
			$.ajax({
				type : 'POST',
				data : {idx : idx, board_code : board_code},
				url : ('/ajax/qna_post_detail_view.cm'),
				dataType : 'json',
				async : false,
				cache : false,
				success : function(res){
					if(res.msg === 'SUCCESS'){
						$.cocoaDialog.open({
							type : 'prod_detail review', custom_popup : res.html, width : 800});
						if(history.replaceState && history.pushState){
							// 모달 히스토리 커스텀(IE 10 이상)
							var current_url = location.href.indexOf('#') === -1 ? location.href : location.href.substr(0, location.href.indexOf('#'));
							var back_url = document.referrer.indexOf('#') === -1 ? document.referrer : document.referrer.substr(0, document.referrer.indexOf('#'));
							history.pushState(null, null, current_url);
							history.replaceState(null, null, current_url + "#prod_detail_qna!/" + res.idx);
						}else{
							location.hash = "prod_detail_qna!!/" + res.idx;
						}
						$(window).off('hashchange').on('hashchange',function(){
							var hash_qna_spilt = location.hash.split('!/')[1];
							if(!hash_qna_spilt){
								$.cocoaDialog.close();
							}else{
								var hash_spilt_tab = location.hash.split('!/')[0];
								if(hash_spilt_tab === '#prod_detail_review'){
									viewReviewPostDetail(hash_qna_spilt, board_code);
								}else if(hash_spilt_tab === '#prod_detail_qna'){
									viewQnaPostDetail(hash_qna_spilt, board_code);
								}
							}
						});
						$('.modal_prod_detail').off('hidden.bs.modal').on('hidden.bs.modal', function (e) {
							removeQnaHash();
						});
					}else{
						alert(res.msg);
					}
				}
			});
		});
	};

	var removeQnaHash = function(){
		$(window).off('hashchange');
    $('html').toggleClass('modal-scroll-control', false);
		var hash_qna_spilt = location.hash.split('!/')[1];
		if(hash_qna_spilt){
			if(history.replaceState && history.pushState){
				history.back();
			}else{
				location.href = '#prod_detail_qna';
			}
		}
	};

  var alertNoSale = function(){
    $.cocoaDialog.open({
      type: 'site_alert',
      custom_popup: `
        <div class="layer_pop">
            <div class="container-fluid">
                <p class="tw-text-center tw-mb-0">
                    ${getLocalizeString('설명_상품페이지이동불가안내', '', '해당 상품 페이지로 이동할 수 없습니다.')}
                </p>
            </div>
            <div class="btn-group-justified">
                <a href="javascript:" class="btn" onclick="$('.modal_site_alert').modal('hide');">${getLocalizeString('버튼_확인', '', '확인')}</a>
            </div>
        </div>`
    }, function(){
      $('.modal_site_alert').css('z-index', 100002);
    });
  }

	return {
		'init' : function(code, data, str_category) {
			postInitWrite(code, data, str_category);
		},
		'initMoreList' : function(widget_code,board_code,listing_type) {
			return postInitMoreList(widget_code,board_code,listing_type);
		},
		'submit' : function(){
			postSubmit();
		},
		'submit_error': function(msg){
			endSubmit(msg);
		},
		// 서버가 요구한 문자 캡차(애매한 스팸 점수)를 등록 버튼 아래에 띄운다 — iframe 안의
		// 응답 스크립트(post_add.cm)가 부른다. 함수 이름·인자 모양이 서버와의 계약이다.
		'showBandCaptcha': function(data){
			showBandCaptcha(data);
		},
		'postCancel': function(back_url){
			postCancel(back_url);
		},
		'addFile' : function(filename,file_code,tmp_idx,size){
			postAddFile(filename,file_code,tmp_idx,size);
		},
		'androidAppPostImageUploadComplete' :function(image){
			androidAppPostImageUploadComplete(image);
		},
		'androidAppPostImageUploadAllComplete' :function(){
			androidAppPostImageUploadAllComplete();
		},
		'deletePost' : function (board_code,code,return_url,secret_pass) {
			postDeletePost(board_code,code,return_url,secret_pass);
		},
		'moreList' : function(keyword,keyword_type,q){
			moreList(keyword,keyword_type,q);
		},
		'toggleAlarmPopup' : function(){
			toggleAlarmPopup();
		},
		'MovePostPopup' : function(post_code,menu_url){
			MovePostPopup(post_code,menu_url);
		},
		'deleteCoverImage' : function(){
			deleteCoverImage();
		},
		'deleteLibraryImage' : function(url){
			deleteLibraryImage(url);
		},
		'categoryTypeSelect' : function($obj,defult_code){
			categoryTypeSelect($obj,defult_code);
		},
		'categoryList' : function(str_category){
			categoryList(str_category);
		},
		'viewReviewPostDetail' : function(idx, board_code){
			viewReviewPostDetail(idx, board_code);
		},
		'removeReviewHash' : function(){
			removeReviewHash();
		},
		'viewQnaPostDetail' : function(idx, board_code){
			viewQnaPostDetail(idx, board_code);
		},
		'removeQnaHash' : function(){
			removeQnaHash();
		},
    'alertNoSale' : function(){
      alertNoSale();
    }
	};
}();

function POST_INIT_LIST(code,data){
	var that 	= this;
	that.type_data = data;
	that.code = code;
	that.windowWidth = $(window).width();
	that.change_timer = setTimeout(function(){},1);
	that.listing_obj = $('#post_card_'+that.code);

	that.listing_obj.imagesLoaded().always(function(ins) {
		that.listResize();
	});

	$('body').off('gridChange.'+that.code).on('gridChange.'+that.code,function(){
		that.listing_obj.imagesLoaded().always(function(ins) {
			that.listResize();
		});
	});

	$(window).off('resize.'+that.code).on('resize.'+that.code,function(){
		if ($(window).width() != that.windowWidth) {
			that.windowWidth = $(window).width();
		}else{
			return;
		}
		clearTimeout(that.change_timer);
		that.change_timer = setTimeout(function(){
			that.listResize();
		},1000);
	});

	this.listResize = function(){
		that.listing_obj.imagesLoaded()
			.always(function(){
				var window_width = $(window).width();
				if(!that.type_data.grid_gutter){
					that.type_data.grid_gutter = 15;
				}
				if($('body').hasClass('device_type_m'))
					window_width = 370;
				if(window_width <= 991)
					that.type_data.grid_gutter = that.type_data.grid_gutter/2;
				that.listing_obj.css({'margin':'0 -'+that.type_data.grid_gutter+'px'});
				if(that.type_data['design_type'] == 'grid' || that.type_data['design_type'] == 'masonry'){
					that.listing_obj.css({'margin-top':'-'+that.type_data.grid_gutter+'px'});
				}

				var cnt = parseInt(that.type_data.grid_col_count);
				var inner_width = that.listing_obj.width();

				if(window_width <= 991){
					if(typeof that.type_data.grid_mobile_col_count == "undefined")
						cnt = 2;
					else
						cnt = parseInt(that.type_data.grid_mobile_col_count);
				}else{
					if(that.type_data.design_type == 'slide'){
						inner_width = that.listing_obj.parent().width();
					}else{
						inner_width = that.listing_obj.width();
					}

					if(that.type_data.grid_extend_fix != 'Y'){
						var s_width = (that.type_data.max_width - (that.type_data.document_margin * 2)) + that.type_data.grid_gutter * 2;
						var item_max = s_width - ((cnt - 1) * parseInt(that.type_data.grid_gutter));
						var grid_width = Math.floor(item_max / cnt);
						var current_width = Math.floor((inner_width - ((cnt - 1) * parseInt(that.type_data.grid_gutter))) / cnt);
						if(current_width > grid_width){
							cnt = Math.floor(inner_width / grid_width);
						}
					}
				}

				var width = Math.floor(inner_width / cnt);
				if(that.type_data['design_type'] == 'grid'){
					that.listing_obj.find('._post_item_wrap').css({'padding' : that.type_data.grid_gutter + 'px'});
					that.runColSize(cnt);
				}else if(that.type_data['design_type'] == 'masonry'){
					var $masonry_item = that.listing_obj.find('.ma-item');
					var masonry_item_count = $masonry_item.length;
					that.listing_obj.find('.ma-item').css({'width' : width,'padding' : that.type_data.grid_gutter + 'px'});
					that.runMasonry(masonry_item_count);
				}
			});
	};

	this.runColSize = function(col_cnt){
		that.listing_obj.find('._card_wrap').show();
		var i = 1;
		var $_row = $('<div />').addClass('_post_row post_row');
		var is_append = false;
		that.listing_obj.find('._dummy_item').remove();
		var $item = that.listing_obj.find('._card_wrap');
		var item_count = $item.length;

		$item.each(function(e,$_obj){
			$_row.append($_obj);
			is_append = false;
			if(i % col_cnt == 0){
				that.listing_obj.append($_row);
				is_append = true;
				$_row = $('<div />').addClass('_post_row post_row');
			}
			i++;
		});

		if(!is_append){
			var $tmp_item = $_row.find('._post_item_wrap');
			if($tmp_item.length >0 ){
				if($tmp_item.length < col_cnt){
					var remain_cnt = col_cnt - $tmp_item.length;
					for(var i = 0; i <remain_cnt; i++){
						var $dummy_col = $('<div/>').addClass('dummy_col item_post _item _dummy_item list-style-card');
						$_row.append($dummy_col);
					}
				}
				that.listing_obj.append($_row);
			}
		}

		that.listing_obj.find('._post_row').each(function(){
			var $tmp_item = $(this).find('._post_item_wrap');
			if($tmp_item.length ==0 ){
				$(this).remove();
			}
		});

		that.imgHeight();
	};

	this.imgHeight = function(){
		if(that.type_data['design_type'] == 'grid'){
			var height = Math.ceil(that.listing_obj.find('._post_item_wrap').eq(0).width() / (that.type_data.img_ratio / 100));
			that.listing_obj.find('._img_wrap').height(height);
		}
	};

	this.runMasonry = function(count){
		if(count > 0){
      let is_masonry_timeout;
			that.listing_obj.off('layoutComplete').on( 'layoutComplete', function() {
        if(that.listing_obj.css('visibility') !== 'visible'){
          that.listing_obj.css('visibility', 'visible');
          that.listing_obj.find('img').lazyload({
            'effect' : 'fadeIn',
            'effect_speed' : 50, // fadeIn 시간 단축(기본 400ms→50ms)
            'load' : function() {
              if(typeof is_masonry_timeout === 'number'){
                clearTimeout(is_masonry_timeout);
              }
              is_masonry_timeout = setTimeout(function(){
                /* 레이지 로드 완료 후 100ms 후에 masonry layout 재실행 */ 
                that.listing_obj.masonry('layout');
              }, 100);
            },
            'threshold': (window.innerHeight * 2)
          });
        }
			});
      that.listing_obj.masonry({
        itemSelector: '.ma-item'
      });
    }else{
      that.listing_obj.css('visibility','visible');
    }
	};
}
