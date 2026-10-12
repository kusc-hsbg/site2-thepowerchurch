
var POST_COMMENT = function(){

	var post_code,total_count,comment_count_obj,comment_form,comment_body, comment_area,child_comment_code,use_sub_secret_comment;
	var $comment_container;
	var comment_img_box;

	var main_comment_image, comment_image, sub_comment_image , use_secret_comment;

	var commentInit = function(code){
		post_code = code;
		comment_count_obj = $('#comment_count');
		total_count = Math.round(comment_count_obj.text());
		$comment_container = $('#comment_container');
		comment_form = $('#comment_form');
		comment_body = $('#comment_body');
		comment_area = $('#comment_area');
		comment_img_box = $('#comment_img_box');
		use_secret_comment = $('#use_secret_comment');
		captcha_answer = $('#captcha_answer');
		captcha_key = $('#captcha_key');
		captcha_img = $('#captcha_img');

		main_comment_image = [];
		comment_image = {};
		sub_comment_image = {};

		$secret = comment_form.find('._secret');
		$secret.on('click', function(){
			if($secret.hasClass('active')){
				$secret.removeClass('active');
				$secret.val('N');
				use_secret_comment.val('N');
			}else{
				$secret.addClass('active');
				$secret.val('Y');
				use_secret_comment.val('Y');
			}
		});


		/*
		comment_area.off('input keyup  paste change','._comment_textarea')
			.on('input keyup  paste change','._comment_textarea', function (e) {
				var input = $(this);
				setTimeout(function(){
					input.limitLength({max_byte:3000});
				}, 0);
		});

		comment_area.off('keydown.enter','._comment_textarea')
			.on('keydown.enter','._comment_textarea', function (e) {
				if (e.keyCode == 13) {
					var target = $('#'+$(this).data('action'));
					target.click();
					e.preventDefault();
				}
			});
			*/

		comment_area.off('input keyup keydown paste change','._comment_nick')
			.on('input keyup keydown paste change','._comment_nick', function () {
				var input = $(this);
				setTimeout(function(){
					input.limitLength({max_byte:30});
				}, 0);
			});

		/*
		comment_area.off('input keyup keydown paste change','._comment_password')
			.on('input keyup keydown paste change','._comment_password', function () {
				var input = $(this);
				setTimeout(function(){
					input.limitLength({max_byte:30});
				}, 0);
			});
			*/


		$("#comment_image_upload_btn").fileupload({
			url: '/ajax/comment_image_upload.cm',
			dataType: 'json',
			singleFileUploads:false,
			limitMultiFileUploads: 5,
			dropZone: null,
			maxFileSize : 20000000, //20mb
			limitMultiFileUploadSize : 110000000, //110 mb
			start: function (e, data) {},
			progress: function (e, data) {},
			done: function (e, data) {
				$("#comment_image_box").show();
				$.each(data.result.comment_images,function(i,file){
					var url = CDN_UPLOAD_URL+file.url;
					var html ='<span class="file-add"><input type="hidden" name="tmp_img[]" value="'+file.tmp_idx+'"><div class="file-add-bg" style="background: url('+url+') no-repeat center center;"></div><em class="del" onclick="POST_COMMENT.removeCommentImg($(this))"></em></span>';
					$("#comment_image_box").append(html);

				});
			},
			fail: function (e, data) {
			}
		});

		autosize(comment_area.find('.textarea_block textarea'));

		//$("#comment_image_box").sortable({
		//	placeholder: 'ui-state-highlight'
		//});
	};

	var removeCommentImg = function(obj){
		var box_obj = obj.parent().parent();
		obj.parent().remove();
		if(box_obj.find('.file-add').length == 0)box_obj.hide();
	};

	var updateAttachToolPosition = function(form,editor){
		var $tool = form.find('._attach_tool');
		var scroll_top = editor.$window.scrollTop();
		var el_offset = editor.$el.offset();

		var boundingRect;

		var range = editor.selection.ranges(0);
		if (range && range.collapsed && editor.selection.inEditor()) {
			var remove = false;

			editor.markers.remove();
			if (editor.$el.find('.fr-marker').length == 0) {
				editor.markers.insert();
				remove = true;
			}

			var $marker = editor.$el.find('.fr-marker:first');
			$marker.css('line-height','inherit');
			$marker.css('display', 'inline');
			var offset = $marker.offset();
			boundingRect = {};
			boundingRect.left = offset.left;
			boundingRect.width = 0;
			boundingRect.height = parseInt($marker.css('line-height'), 10) || 20;

			var marker_tag_name = $marker.parent().prop("tagName");
			marker_tag_name = marker_tag_name.toLowerCase();
			if($.inArray(marker_tag_name, ['p','span','h1','h2','h3','h4','h5','h6','h7','h8','strong','b','font','a','i'])) {
				var outer_h = Math.round($marker.parent().outerHeight());
				boundingRect.height = outer_h;
			}
			boundingRect.top = offset.top - $(editor.original_window).scrollTop();
			boundingRect.right = 1;
			boundingRect.bottom = 1;
			boundingRect.ok = true;
			$marker.css('display', 'none');

			if (remove) editor.markers.remove();
		}
		else if (range) {
			boundingRect = range.getBoundingClientRect();
		}

		var attach_tool_left = el_offset.left-boundingRect.left;
		$tool[attach_tool_left ==0?'show':'hide']();
		var attach_tool_top = scroll_top+boundingRect.top-el_offset.top + (boundingRect.height/2) - ($tool.outerHeight()/2);
		$tool.css('top',attach_tool_top);
	};

	var hideAttachTool = function(obj){
		obj.find('._attach_tool').removeClass('open');
	};


	var commentIncreaseTotalCount = function(){
		total_count++;
		comment_count_obj.text(total_count);
	};

	var commentDecreaseTotalCount = function(decrease_count = 1){
		total_count -= decrease_count;
		comment_count_obj.text(total_count);
	};

	var is_writing = false;

	/**
	 * 댓글 등록 **성공** 처리. 등록 응답에만 쓴다 — 새로고침은 이 처리를 타지 않는다
	 * (새로고침이 저장을 부르면 화면이 "저장된 것처럼" 움직여 그대로 오해가 된다).
	 */
	var applyCommentAddSuccess = function(result){
		comment_body.val('');
		$("#comment_image_box").empty().hide();
		commentFormHide();
		commentIncreaseTotalCount();
		if(result.comment_sorting_type == 'forward_new_comment'){
			$comment_container.prepend(result.html);
			moveToCommentListTop();
		}else {
			$comment_container.find('div.comment_list div.comment:last').length === 0 ? $comment_container.append(result.html) : $comment_container.find('div.comment_list div.comment:last').after(result.html);
		}
		autosize.update($('.comment_textarea').find('#comment_body'));

		// 요구받았던 캡차는 한 번 쓰면 끝난다(키도 서버에서 소비됐다) — 블록을 걷어낸다.
		captchaChallengeBlock(comment_form).remove();
	};

	var commentAdd = function(){
		if(!is_writing){
			var data = comment_form.serializeObject();

			if (data.captcha_key) {
				if (data.body.length > 0 && data.captcha_answer.length === 0) {
					refreshCaptchaForSubmit('comment');
					alert(getLocalizeString("설명_보안문자입력", "", "보안 문자를 입력해 주세요."));
					return;
				}
			}

			var menu_url = window.location.pathname;
			data.menu_url = menu_url;
			$.ajax({
				type:'post',
				data:data,
				url:'/ajax/post_comment_add.cm',
				dataType:'json',
				success:function(result){
          tokenRefresh(comment_form, result.refresh_token, result.refresh_token_key);
					if(result.msg=='SUCCESS') {
						if(result.qna_status_changed){ location.reload(); return; }
						applyCommentAddSuccess(result);
					}else {
						// 애매한 스팸 점수면 서버가 문자 캡차를 요구한다 — 문구와 함께 캡차를 띄운다.
						if (result.captcha_required) applyCaptchaChallenge(result, 'comment');
						alert(result.msg);
					}

					is_writing = false;
				},
				complete:function(){
					if (data.captcha_key) {
						refreshCaptchaAfterSubmit('comment');
					}
				}
			});
			is_writing = true;
		}
	};

	var refreshCaptcha = function(form_type = 'comment', code){
		var sub_form_captcha_answer = $('#sub_form_captcha_answer_'+code);
		var sub_form_captcha_key = $('#sub_form_captcha_key_'+code);
		var sub_form_captcha_img = $('#sub_form_captcha_img_'+code);

		$.ajax({
			type:'post',
			data:{
				'captcha_key': form_type == 'comment' ? captcha_key.val() : sub_form_captcha_key.val(),
				'target': 'comment',
			},
			url:'/ajax/refresh_captcha.cm',
			dataType:'json',
			success:function(result){
				if (result.msg == 'SUCCESS') {
					if (form_type == 'comment') {
						captcha_answer.val('');
						captcha_img.attr('src', result.captcha_img);
						captcha_key.val(result.key);
					} else if (form_type == 'sub_form') {
						sub_form_captcha_answer.val('');
						sub_form_captcha_img.attr('src', result.captcha_img);
						sub_form_captcha_key.val(result.key);
					}
				} else {
					alert(result.msg);
				}
			}
		});
	};

	// ── 요구형 문자 캡차 — 서버가 애매한 스팸 점수(0.50 이상·임계 미만)에서 요구한다 ──────
	// 사이트가 캡차를 켠 경우의 블록(.captcha_block·.sub_form_captcha_block)은 **서버가** 그려서
	// 항상 폼 안에 있다. 여기서 만드는 블록은 요구받았을 때만 생기고, 입력칸 이름은 같다
	// (captcha_key·captcha_answer) — 그래서 폼 직렬화에 그대로 실려 서버가 검증한다.
	var CAPTCHA_CHALLENGE_ATTR = 'data-fo-captcha-challenge';

	// 사이트 캡차 화면(site_ui.cls)이 쓰는 새로고침 아이콘과 같은 모양이다.
	var CAPTCHA_CHALLENGE_REFRESH_ICON = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">'
		+ '<path d="M1 0.5H27C27.2761 0.5 27.5 0.723857 27.5 1V27C27.5 27.2761 27.2761 27.5 27 27.5H1C0.723858 27.5 0.5 27.2761 0.5 27V1C0.5 0.723858 0.723857 0.5 1 0.5Z" fill="white"/>'
		+ '<path d="M1 0.5H27C27.2761 0.5 27.5 0.723857 27.5 1V27C27.5 27.2761 27.2761 27.5 27 27.5H1C0.723858 27.5 0.5 27.2761 0.5 27V1C0.5 0.723858 0.723857 0.5 1 0.5Z" stroke="#BCC0C6"/>'
		+ '<path d="M15.3333 7.3335C15.3333 7.3335 15.8995 7.41438 18.2426 9.75752C20.5858 12.1007 20.5858 15.8997 18.2426 18.2428C17.4125 19.073 16.3995 19.609 15.3333 19.8509M15.3333 7.3335L19.3333 7.3335M15.3333 7.3335L15.3333 11.3335M12.6667 20.6667C12.6667 20.6667 12.1005 20.5858 9.75736 18.2427C7.41421 15.8995 7.41421 12.1005 9.75736 9.75739C10.5875 8.92721 11.6005 8.39116 12.6667 8.14925M12.6667 20.6667L8.66667 20.6668M12.6667 20.6667L12.6667 16.6668" stroke="#4B515B" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
		+ '</svg>';

	// 그 폼의 요구 블록(없으면 빈 jQuery). 폼마다 하나만 만든다.
	var captchaChallengeBlock = function(form){
		return form.find('[' + CAPTCHA_CHALLENGE_ATTR + ']');
	};

	// 폼 고르기 — 일반 댓글은 #comment_form, 대댓글은 그 댓글의 답글 폼이다.
	var captchaChallengeForm = function(form_type, code){
		if (form_type == 'sub_form' && code) return $('#' + code).find('._add_sub_form_' + code);

		return comment_form;
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

	// 서버 요구 응답(captcha_required·captcha_img·key)을 그 폼에 반영한다.
	var applyCaptchaChallenge = function(result, form_type, code){
		var form = captchaChallengeForm(form_type, code);

		// 그릴 수 없는 응답이면 문구만 남는다(등록을 막지 않는다 — 서버가 저장 여부를 정한다).
		if (form.length === 0 || !result.captcha_img || !result.key) return;

		var block = captchaChallengeBlock(form);

		if (block.length === 0) {
			block = createCaptchaChallengeBlock();
			block.find('._captcha_challenge_refresh').on('click', function(){
				refreshCaptchaChallenge(form_type, code);
			});
			form.append(block);
		}

		block.find('img').attr('src', result.captcha_img);
		block.find('input[name="captcha_key"]').val(result.key);
		block.find('input[name="captcha_answer"]').val('');
		block.css('display', 'flex');
	};

	// 새로고침 — **발급 전용 엔드포인트**로 새 이미지·키만 받는다.
	//
	// 댓글 등록 경로(post_comment_add.cm)를 다시 태우면 안 된다: 새로고침이 판정·게이트를 다시
	// 태우고, 그 사이 판정이 통과하면(캐시 만료·판정 실패) **실제로 댓글이 저장된다** — 사용자는
	// 캡차만 새로 받으려 했는데 글이 올라간다. 그래서 폼을 직렬화해 보내지 않는다(본문·이미지가
	// 실려 나가면 그 자체가 저장 요청의 재료다). 서버는 이 키의 결속 표식을 선점(DEL)한 요청에만
	// 새 캡차를 발급하므로, 이미 쓴 키로는 발급되지 않고 문구만 돌아온다.
	var refreshCaptchaChallenge = function(form_type, code){
		var form = captchaChallengeForm(form_type, code);
		var block = captchaChallengeBlock(form);
		if (form.length === 0 || block.length === 0) return;

		$.ajax({
			type:'post',
			data:{
				'captcha_key': block.find('input[name="captcha_key"]').val(),
				'target': 'comment',
				'band_captcha': '1'
			},
			url:'/ajax/refresh_captcha.cm',
			dataType:'json',
			success:function(result){
				if (result.msg == 'SUCCESS') {
					// 새 이미지·새 키를 그대로 반영한다(입력칸은 비운다).
					applyCaptchaChallenge(result, form_type, code);
				} else {
					alert(result.msg);
				}
			}
		});
	};

	// 캡차를 다시 그리는 자리 — 요구형 캡차가 떠 있으면 그것을, 아니면 사이트 캡차를 갱신한다.
	var refreshCaptchaForSubmit = function(form_type, code){
		if (captchaChallengeBlock(captchaChallengeForm(form_type, code)).length > 0) {
			refreshCaptchaChallenge(form_type, code);
			return;
		}

		if (form_type == 'sub_form') refreshCaptcha('sub_form', code);
		else refreshCaptcha();
	};

	/**
	 * 등록 **시도 뒤**의 갱신 — master 와 같이 사이트 캡차만 새로 받는다.
	 *
	 *  - 요구형 캡차가 떠 있으면 아무것도 하지 않는다: 등록 실패 응답에 서버가 **이미 새 캡차를
	 *    담아 줬고**(그 키의 결속 표식도 갓 발급됐다), 여기서 다시 부르면 표식만 소모된다.
	 *  - 사이트 캡차가 없는 폼도 건드리지 않는다: 보낼 키가 없어 서버가 오류 문구를 돌려주고,
	 *    그 문구가 **등록에 성공한 직후에** alert 로 뜬다.
	 */
	var refreshCaptchaAfterSubmit = function(form_type, code){
		if (captchaChallengeBlock(captchaChallengeForm(form_type, code)).length > 0) return;

		if (form_type == 'sub_form') {
			if ($('#sub_form_captcha_key_'+code).length > 0) refreshCaptcha('sub_form', code);
			return;
		}

		if (captcha_key.length > 0) refreshCaptcha();
	};

	var commentFormHide = function(){
		$comment_container = $('#comment_container');

		$comment_container.find('._comment_area').show();
		$comment_container.find('._sub_comment_wrap').show();
		$comment_container.find('._sub_form').hide();
		$comment_container.find('._comment_edit_form').hide();
		$comment_container.find('.write').show();
	};

	var commentShowEdit = function(code, interlock_type){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_edit_body_'+code);
		var comment_wrap = obj.find('._comment_wrap_'+code);

		comment_image[code] = [];
		comment_edit_body.data('org_body',comment_edit_body.val());
		commentFormHide();
		comment_wrap.find('._comment_area').hide();
		comment_wrap.find('.write').hide();

		$.ajax({
			type:'post',
			data: {'code' : code, 'board_type': interlock_type},
			url:'/ajax/append_post_comment_html.cm',
			dataType:'json',
			success:function(res){
				obj.find('._comment_edit_form_'+code).html(res.html);
				autosize.update(obj.find('._comment_edit_body'));
				if(comment_wrap.find("._comment_body img").length>0) $("#comment_image_modify_box_"+code).show();
				$("#comment_image_upload_modify_btn_"+code).fileupload({
					url: '/ajax/comment_image_upload.cm',
					dataType: 'json',
					singleFileUploads:false,
					limitMultiFileUploads: 5,
					dropZone: null,
					maxFileSize : 20000000, //20mb
					limitMultiFileUploadSize : 110000000, //110 mb
					start: function (e, data) {},
					progress: function (e, data) {},
					done: function (e, data) {
						$("#comment_image_modify_box_"+code).show();
						$.each(data.result.comment_images,function(i,file){
							var url = CDN_UPLOAD_URL+file.url;
							var html ='<span class="file-add"><input type="hidden" name="tmp_img[]" value="'+file.tmp_idx+'"><div class="file-add-bg" style="background: url('+url+') no-repeat center center;"></div><em class="del" onclick="POST_COMMENT.removeCommentImg($(this))"></em></span>';
							$("#comment_image_modify_box_"+code).append(html);

						});
					},
					fail: function (e, data) {
					}
				});
				autosize(comment_area.find('.textarea_block textarea'));
			}
		});

		obj.find('._comment_edit_form_'+code).show();

	};

	var commentEdit = function(code){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_edit_body_'+code);

		var form = obj.find('._comment_edit_form_'+code+' ._edit_form');

		var comment_body = obj.find('._comment_wrap_'+code+' ._comment_body_'+code);


		var data = form.serializeObject();

		var new_img = form.find("input[name='tmp_img[]']");
		var org_img = form.find("input[name='org_img[]']");
		var img_old_cnt = form.find("input[name='org_image_old_cnt']");
		var secret_comment = form.find("input[name='secret_comment']");

		if((comment_edit_body.val() == comment_edit_body.data('org_body')) && (new_img.length == 0) && (img_old_cnt.val() == org_img.length) && secret_comment.val() == secret_comment.attr('orig')) {
			commentFormHide();
			return;
		}
		$.ajax({
			type:'post',
			data:data,
			url:'/ajax/post_comment_add.cm',
			dataType:'json',
			success:function(result){
        tokenRefresh(form, result.refresh_token, result.refresh_token_key);
				if(result.msg=='SUCCESS') {
					if(result.qna_status_changed){ location.reload(); return; }
					comment_edit_body.data('org_body', result.data.body);
					comment_body.html('<div>'+result.data.body+'</div>');
					comment_body.append(result.data.img_html);
					switch(secret_comment.val()){
						case 'Y':
							$('#icon_' + code).show();
							break;
						case 'N':
							$('#icon_' + code).hide();
							break;
					}
					commentFormHide();
					commentDestroyEdit(code);
				}else
					alert(result.msg);
			}
		});

	};

	var commentEditMap = function(code){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_edit_body_'+code);

		var form = obj.find('._comment_edit_form_'+code+' ._edit_form');

		var comment_body = obj.find('._comment_wrap_'+code+' ._comment_body_'+code);


		var data = form.serializeObject();

		var new_img = form.find("input[name='tmp_img[]']");
		var org_img = form.find("input[name='org_img[]']");
		var img_old_cnt = form.find("input[name='org_image_old_cnt']");

		if((comment_edit_body.val() == comment_edit_body.data('org_body')) && (new_img.length == 0) && (img_old_cnt.val() == org_img.length)) {
			commentFormHide();
			return;
		}
		$.ajax({
			type:'post',
			data:data,
			url:'/ajax/map_comment_add.cm',
			dataType:'json',
			success:function(result){
				if(result.msg=='SUCCESS') {
					comment_edit_body.data('org_body', result.data.body);
					comment_body.html(result.data.body);
					comment_body.append(result.data.img_html);
					commentFormHide();
					commentDestroyEdit(code);
				}else
					alert(result.msg);
			}
		});
	};

	var commentDestroyEdit = function(code){
		var obj = $('#'+code);
		comment_image[code] = [];
	};

	var commentDestroyAddEditor = function(code){
		var obj = $('._add_sub_form_'+code);
		comment_image[code] = [];
		var comment_edit_body = obj.find('._comment_add_body_'+code);
		comment_edit_body.val('');
	};

	var commentCancelEdit = function(code){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_edit_body_'+code);
		comment_edit_body.val(comment_edit_body.data('org_body'));
		commentFormHide();
		commentDestroyEdit(code);
	};

	var commentShowSubForm = function(code){
		var obj = $('#'+code);
		var sub_form = obj.find('._sub_form_'+code);

		var use_sub_secret_comment = sub_form.find('#use_sub_secret_comment');
		$sub_secret = sub_form.find('._secret');
		$sub_secret.on('click', function(){
			if($sub_secret.hasClass('active')){
				$sub_secret.removeClass('active');
				$sub_secret.val('N');
				use_sub_secret_comment.val('N');
			}else{
				$sub_secret.addClass('active');
				$sub_secret.val('Y');
				use_sub_secret_comment.val('Y');
			}
		});

		commentFormHide();
		if(sub_form.data('show')=='Y'){
			sub_form.data('show', 'N');
			$('body').off('mouseup.sub_comment');
		}else {
			sub_form.data('show', 'Y');
			obj.find('._sub_form_' + code).show();
			sub_comment_image[code] = [];
			var comment_add_body = obj.find('._comment_add_body_' + code);

			$('body').off('mouseup.sub_comment')
				.on('mouseup.sub_comment', function (e) {
					var $c_target = $(e.target);
					var $s_form = $c_target.closest('._sub_form_' + code+', ._show_sub_form_btn_'+code);
					if ($s_form.length == 0) {

						var text = comment_add_body.val();
						sub_form.data('show', 'N');
						if(text == '') {
							$('body').off('mouseup.sub_comment');
							commentFormHide();
						}
					}
				});
		}
		$("#comment_image_upload_btn_"+code).fileupload({
			url: '/ajax/comment_image_upload.cm',
			dataType: 'json',
			singleFileUploads:false,
			limitMultiFileUploads: 5,
			dropZone: null,
			maxFileSize : 20000000, //20mb
			limitMultiFileUploadSize : 110000000, //110 mb
			start: function (e, data) {},
			progress: function (e, data) {},
			done: function (e, data) {
				$("#comment_image_box_"+code).show();
				$.each(data.result.comment_images,function(i,file){
					var url = CDN_UPLOAD_URL+file.url;
					var html ='<span class="file-add"><input type="hidden" name="tmp_img[]" value="'+file.tmp_idx+'"><div class="file-add-bg" style="background: url('+url+') no-repeat center center;"></div><em class="del" onclick="POST_COMMENT.removeCommentImg($(this))"></em></span>';
					$("#comment_image_box_"+code).append(html);

				});
			},
			fail: function (e, data) {
			}
		});
	};

	/**
	 * 대댓글 등록 성공 처리. 위 댓글 등록과 같은 이유로 분리한다(캡차 새로고침도 쓴다).
	 */
	var applyCommentAddSubSuccess = function(result, code){
		var obj = $('#'+code);
		var comment_sub_body = obj.find('._comment_add_body_'+code);
		var $image_box = obj.find('#comment_image_box_'+code);

		comment_sub_body.val('');
		commentFormHide();
		commentAddSubHTML(result.data.parent_code !='' ? result.data.parent_code : result.data.code,result.html);
		commentDestroyAddEditor(code);
		//self.location.hash=result.data.code;

		$image_box.empty();

		// 요구받았던 캡차는 한 번 쓰면 끝난다(키도 서버에서 소비됐다) — 블록을 걷어낸다.
		captchaChallengeBlock(obj.find('._add_sub_form_'+code)).remove();
	};

	var commentAddSub = function(code){
		var obj = $('#'+code);
		var comment_sub_body = obj.find('._comment_add_body_'+code);
		var form = obj.find('._add_sub_form_'+code);
		var $image_box = obj.find('#comment_image_box_'+code);
		var data = form.serializeObject();

		var tmp_img = {'temp_images':sub_comment_image[code]};
		data = $.extend(data,tmp_img);

		if (data.captcha_key) {
			if (data.body.length > 0 && data.captcha_answer.length === 0) {
				refreshCaptchaForSubmit('sub_form', code);
				alert(getLocalizeString('설명_보안문자입력','','보안 문자를 입력해 주세요.'));
				return;
			}
		}

		$.ajax({
			type:'post',
			data:data,
			url:'/ajax/post_comment_add.cm',
			dataType:'json',
			success:function(result){
				tokenRefresh(form, result.refresh_token, result.refresh_token_key);

				if(result.msg=='SUCCESS') {
					if(result.qna_status_changed){ location.reload(); return; }
					applyCommentAddSubSuccess(result, code);
				} else {
					// 애매한 스팸 점수면 서버가 문자 캡차를 요구한다 — 문구와 함께 캡차를 띄운다.
					if (result.captcha_required) applyCaptchaChallenge(result, 'sub_form', code);
					alert(result.msg);
				}
			},
			complete:function(){
				if (data.captcha_key) {
					refreshCaptchaAfterSubmit('sub_form', code);
				}
			}
		});
	};

  var tokenRefresh = function(form, refresh_token, refresh_token_key){
    form.find('input[name="comment_token"]').val(refresh_token ? refresh_token : "");
    form.find('input[name="comment_token_key"]').val(refresh_token_key ? refresh_token_key : "");
  };
  
	var commentMapAddSub = function(code){
		var obj = $('#'+code);
		var comment_sub_body = obj.find('._comment_add_body_'+code);
		var form = obj.find('._add_sub_form_'+code);
		var data = form.serializeObject();

		var tmp_img = {'temp_images':sub_comment_image[code]};
		data = $.extend(data,tmp_img);

		$.ajax({
			type:'post',
			data:data,
			url:'/ajax/map_comment_add.cm',
			dataType:'json',
			success:function(result){
				if(result.msg=='SUCCESS') {
					comment_sub_body.val('');
					commentFormHide();
					if(result.map_listing == 'map'){
						var map_sub_comment_count = 0;
						map_sub_comment_count = Math.round($('#list_'+result.list_idx).find('#comment_count').text());
						map_sub_comment_count++;
						$('#list_'+result.list_idx).find('#comment_count').text(map_sub_comment_count);
						$('#comment_area').find('#comment_count').text(map_sub_comment_count);
						$('#list_pop_'+result.list_idx).find('#comment_count').text(map_sub_comment_count);
						var sub_code = result.data.parent_code !='' ? result.data.parent_code : result.data.code;
						var comment_sub_list = $('#'+sub_code).find('._comment_sub_list');
						comment_sub_list.append(result.html);
						commentIncreaseTotalCount();
					}else{
						commentAddSubHTML(result.data.parent_code !='' ? result.data.parent_code : result.data.code,result.html);
					}
					commentDestroyAddEditor(code);
					//self.location.hash=result.data.code;
				}else
					alert(result.msg);
			}
		});
	};

	var commentShowSubEdit = function(code){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_sub_edit_body');
		comment_edit_body.data('org_body',comment_edit_body.val());
		comment_edit_body.focus();
		commentFormHide();
		obj.find('._comment_sub_wrap').hide();
		obj.find('._comment_sub_edit_form').show();

		$("#comment_image_upload_modify_btn_"+code).fileupload({
			url: '/ajax/comment_image_upload.cm',
			dataType: 'json',
			singleFileUploads:false,
			limitMultiFileUploads: 5,
			dropZone: null,
			maxFileSize : 20000000, //20mb
			limitMultiFileUploadSize : 110000000, //110 mb
			start: function (e, data) {},
			progress: function (e, data) {},
			done: function (e, data) {
				$("#comment_image_modify_box_"+code).show();
				$.each(data.result.comment_images,function(i,file){
					var url = CDN_UPLOAD_URL+file.url;
					var html ='<span class="file-add"><input type="hidden" name="tmp_img[]" value="'+file.tmp_idx+'"><div class="file-add-bg" style="background: url('+url+') no-repeat center center;"></div><em class="del" onclick="POST_COMMENT.removeCommentImg($(this))"></em></span>';
					$("#comment_image_modify_box_"+code).append(html);

				});
			},
			fail: function (e, data) {
			}
		});

	};

	var commentCancelSubEdit = function(code){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_sub_edit_body');
		comment_edit_body.val(comment_edit_body.data('org_body'));
		commentFormHide();

	};

	var commentSubEdit = function(code){
		var obj = $('#'+code);
		var comment_edit_body = obj.find('._comment_sub_edit_body');
		var comment_body = obj.find('._comment_sub_body');
		var form = obj.find('._sub_edit_form');
		var data = form.serializeObject();
		if(comment_edit_body.val() == comment_edit_body.data('org_body')) {
			commentFormHide();
			return;
		}
		$.ajax({
			type:'post',
			data:data,
			url:'/ajax/post_comment_add.cm',
			dataType:'json',
			success:function(result){
				if(result.msg=='SUCCESS') {
					if(result.qna_status_changed){ location.reload(); return; }
					comment_edit_body.data('org_body', result.data.body);
					comment_body.html($.nl2br(result.data.body));
					commentFormHide();
				}else
					alert(result.msg);
			}
		});

	};

	var commentAddHTML = function(html){
		commentIncreaseTotalCount();
		comment_container.append(html);
	};


	var commentConfirmShow = function(event, code , type, interlock_type, use_interlock_board){
		$post_secret_password = $('#post_secret_password');

		if($post_secret_password.length==0){
			$post_secret_password = $('<div class="remove-pop" id="post_secret_password" style="position:absolute; left:0;top:0;z-index:99999;"><p>' + LOCALIZE.설명_작성시등록하신비밀번호를입력해주세요() + '</p><div class="input_area"><input type="password" placeholder="' + LOCALIZE.설명_비밀번호() + '"><button class="btn btn-primary _confirm">' + LOCALIZE.버튼_확인닫기() + '</button></div></div>').hide();
			$('body').append($post_secret_password);
		}
			var $post_link = $(event.target);

			var top = $post_link.offset().top;
			var left = $post_link.offset().left;

			$post_secret_password.css({
				position : 'absolute',
				top : top,
				left : left
			});
		$post_secret_password.find('input').val('');
			$post_secret_password.show();
			$post_secret_password.off('click','._confirm')
				.on('click','._confirm',function(){
					var secret_pass = $post_secret_password.find('input').val();
					$post_secret_password.hide();
					switch(type){
						case 'show' : commentShow(code,secret_pass,interlock_type);
						break;
						case 'delete' : commentDelete(code,secret_pass,interlock_type,use_interlock_board);
						break;
						case 'edit' :  commentEditShow(code,secret_pass,interlock_type);
						break;
					}
				});

			$('body').off('mousedown.post_secret')
				.on('mousedown.post_secret',function(e){
					var $tmp = $(e.target).closest('#post_secret_password');
					if($tmp.length==0) {
						$post_secret_password.hide();
						$('body').off('click.post_secret');
					}
				});
	};

	var commentMapConfirmShow = function(event, code, type, interlock_type){
		$post_secret_password = $('#post_secret_password');
		if($post_secret_password.length==0){
			$post_secret_password = $('<div class="remove-pop" id="post_secret_password" style="position:absolute; left:0;top:0;z-index:99999;"><p>'+LOCALIZE.설명_작성시등록하신비밀번호를입력해주세요()+'</p><div class="input_area"><input type="password" placeholder="'+LOCALIZE.설명_비밀번호()+'"><button class="btn btn-primary _confirm">'+LOCALIZE.버튼_확인닫기()+'</button></div></div>').hide();
			$('body').append($post_secret_password);
		}
		var $post_link = $(event.target);

		var top = $post_link.offset().top;
		var left = $post_link.offset().left;

		$post_secret_password.css({
			position : 'absolute',
			top : top,
			left : left
		});

		$post_secret_password.find('input').val('');
		$post_secret_password.show();
		$post_secret_password.off('click','._confirm')
			.on('click','._confirm',function(){
				var secret_pass = $post_secret_password.find('input').val();
				$post_secret_password.hide();
				switch(type){
					case 'show'   : commentMapShow(code,secret_pass);
					break;
					case 'delete' : commentMapDelete(code,secret_pass);
					break;
					case 'edit'   : commentEditShow(code,secret_pass,interlock_type);
					break;
				}
			});
		$('body').off('mousedown.post_secret')
			.on('mousedown.post_secret',function(e){
				var $tmp = $(e.target).closest('#post_secret_password');
				if($tmp.length==0) {
					$post_secret_password.hide();
					$('body').off('click.post_secret');
				}
			});
	};

	var commentDelete = function(code,secret_pass,interlock_type,use_interlock_board){
		var obj = $('#'+code);
		var comment_wrap = obj.find('._comment_wrap_'+code);
		if(confirm(LOCALIZE.설명_삭제하시겠습니까())){
			$.ajax({
				type:'post',
				data:{
					code:code,
					post_code:post_code,
					secret_pass:secret_pass,
					interlock_type:interlock_type,
					use_interlock_board:use_interlock_board
				},
				url:'/ajax/post_comment_delete.cm',
				dataType:'json',
				success:function(result){
					if(result.msg == 'SUCCESS'){
						if(result.mode == 'delete'){
							comment_wrap.html(LOCALIZE.설명_삭제된_댓글_입니다());
						}else {
							obj.remove();
						}
						commentDecreaseTotalCount();
					}else{
						alert(result.msg);
					}
				}
			});
		}
	};

	var commentShow = function(code,secret_pass,interlock_type){
		$.ajax({
			type : 'POST',
			data : {code : code, post_code : post_code, secret_pass : secret_pass, show: 'Y', board_type:interlock_type},
			url : ('/ajax/post_comment_show.cm'),
			dataType : 'json',
			success : function(result){
				if(result.msg == 'SUCCESS'){
					$("._comment_body_"+code).find("#secret_comment_text").text(result.html);
					$("._comment_body_"+code).find($("img")).attr("src",result.img_url);
					if(result.isSubComment){
						for(var i in result.sub_comment){
							var sub_data = result.sub_comment[i];
							$('._comment_body_'+sub_data.code).html(sub_data.html);
						}
					}
				}else
					alert(result.msg);
			}
		});

	};
	var commentEditShow = function(code,secret_pass,interlock_type){
		$.ajax({
			type : 'POST',
			data : {code : code, post_code : post_code, secret_pass : secret_pass, board_type : interlock_type},
			url : ('/ajax/post_comment_show.cm'),
			dataType : 'json',
			success : function(result){
				if(result.msg == 'SUCCESS'){
					commentShowEdit(code,interlock_type);
				}else
					alert(result.msg);
			}
		});
	};

	var commentMapShow = function(code, secret_pass){
		$.ajax({
			type : 'POST',
			data : {code : code, post_code : post_code, secret_pass : secret_pass},
			url : ('/ajax/post_map_comment_show.cm'),
			dataType : 'json',
			success : function(result){
				if(result.msg == 'SUCCESS'){
					$("._comment_body_"+code).find("#secret_comment_text").text(result.html);
					$("._comment_body_"+code).find($("img")).attr("src",result.img_url);
					if(result.isSubComment){
						for(var i in result.sub_comment){
							var sub_data = result.sub_comment[i];
							$('._comment_body_'+sub_data.code).html(sub_data.html);
						}
					}
				}else
					alert(result.msg);
			}
		});
	};

	var commentMapDelete = function(code,secret_pass){
		var obj = $('#'+code);
		var comment_wrap = obj.find('._comment_wrap_'+code);
		if(confirm(LOCALIZE.설명_삭제하시겠습니까())){
			$.ajax({
				type:'post',
				data:{code:code,post_code :post_code,secret_pass:secret_pass},
				url:'/ajax/map_comment_delete.cm',
				dataType:'json',
				success:function(result){
					if(result.msg == 'SUCCESS'){
						if(result.mode == 'delete'){
							comment_wrap.html(LOCALIZE.설명_삭제된_댓글_입니다());
						}else {
							obj.remove();
						}
						if(result.map_listing == 'map'){
							var map_comment_count = 0;
							map_comment_count = Math.round($('#list_'+result.list_idx).find('#comment_count').text());
							map_comment_count--;
							$('#list_'+result.list_idx).find('#comment_count').text(map_comment_count);
							$('#comment_area').find('#comment_count').text(map_comment_count);
							$('#list_pop_'+result.list_idx).find('#comment_count').text(map_comment_count);
						}else{
							commentDecreaseTotalCount(result.decrease_count);
						}
					}else{
						alert(result.msg);
					}
				}
			});
		}
	};


	var commentAddSubHTML = function(code,html){
		var obj = $('#'+code);
		var comment_sub_list = obj.find('._comment_sub_list');
		comment_sub_list.append(html);
		commentIncreaseTotalCount();
	};

	var commentToggleSub = function (parent_comment_id){
		var parent_obj = $('#'+parent_comment_id);
		var loaded = parent_obj.data('sub_loaded');
		var sub_open = parent_obj.data('sub_open');
		var sub_comment_wrap = parent_obj.find('._sub_comment_wrap');
		var sub_comment_list = parent_obj.find('._sub_comment_list');
		var arrow_icon = parent_obj.find('._arrow_icon');
		if(typeof loaded == 'undefined' || loaded == false){
			$.ajax({
				type:'post',
				data:{code : parent_comment_id},
				url:'/ajax/getChildComment.cm',
				dataType:'json',
				success:function(data){
					var html = $(data.html);
					sub_comment_list.append(html);
					sub_comment_wrap.show();
					arrow_icon.removeClass('zmdi-chevron-down').removeClass('zmdi-chevron-down').removeClass('zmdi-chevron-down');
					arrow_icon.addClass('zmdi-chevron-up');
					parent_obj.data('sub_loaded', true);
					parent_obj.data('sub_open', true);
				}
			});
		}else{
			if(typeof sub_open == 'undefined' || sub_open == false){
				sub_comment_wrap.show();
				arrow_icon.removeClass('zmdi-chevron-down').removeClass('zmdi-chevron-down').removeClass('zmdi-chevron-down');
				arrow_icon.addClass('zmdi-chevron-up');
				parent_obj.data('sub_loaded', true);
			}else{
				sub_comment_wrap.hide();
				arrow_icon.removeClass('zmdi-chevron-up').removeClass('zmdi-chevron-up').removeClass('zmdi-chevron-up');
				arrow_icon.addClass('zmdi-chevron-down');
				parent_obj.data('sub_loaded', false);
			}
		}
	};

	var commentMapAdd = function(){
		var data = comment_form.serializeObject();
		$.ajax({
			type:'post',
			data:data,
			url:'/ajax/map_comment_add.cm',
			dataType:'json',
			success:function(result){
				if(result.msg=='SUCCESS') {
					comment_body.val('');
					$("#comment_image_box").empty().hide();
					commentFormHide();
					if(result.map_listing == 'map'){
						var map_comment_count = 0;
						map_comment_count = result.comment_cnt;
						$('#list_'+result.list_idx).find('._comment_count').text(map_comment_count);
						$('#comment_area').find('#comment_count').text(map_comment_count);
						$('#list_pop_'+result.list_idx).find('._comment_count').text(map_comment_count);
						if(result.map_comment_sort == 'asc' || !result.map_comment_sort){
							$comment_container.find('div.comment_list div.comment:last').length === 0 ? $comment_container.append(result.html) : $comment_container.find('div.comment_list div.comment:last').after(result.html);
						}else{
							$comment_container.prepend(result.html);
							moveToCommentListTop();
						}
						autosize.update($('.comment_textarea').find('#comment_body'));
					}else{
						commentAddHTML(result.html);
					}
				}else
					alert(result.msg);
			}
		});
	};

	var getCommentListByCurrentPagingNum = function(current_page, is_move_to_comment_list_top){
		var is_loaded = false;
		if(is_loaded === false){ // 재호출 방지
			is_loaded = true;
			$.ajax({
				type:'post',
				data:{
					'board_code': comment_form.find("input[name='board_code']").val(),
					'post_code': post_code,
					'current_page':current_page
				},
				url:'/ajax/post_comment_paging.cm',
				dataType:'json',
				success:function(result){
					is_loaded = false;
					if(result.msg === 'SUCCESS') {
						$comment_container.html(result.html);
						if(is_move_to_comment_list_top) moveToCommentListTop();
					}else{
						alert(result.msg);
					}
				}
			});
		}
	};

	var moveToCommentListTop = function(){
		var $modal_widget_fullboard = $('.modal_widget_fullboard');
		var $pos_comment_container = $('#comment_container');

		// 위젯 위치 세팅
		if($modal_widget_fullboard.length > 0){
			$modal_widget_fullboard.scrollTop($('.comment-block').position().top);
		}else if($pos_comment_container.length > 0){
			// 스크롤 고정 메뉴 확인
			var fixed_header_section = $("._fixed_header_section");
			var header_height = 0;

			if(fixed_header_section.length > 0){
				for(var i = 0; i < fixed_header_section.length; i++){
					header_height += 2 * fixed_header_section[i].offsetHeight;
				}
			}
			// 상단 고정 메뉴 확인
			var new_fixed_header = $('#doz_header_wrap').find('._new_fixed_header');
			if(new_fixed_header.length > 0){
				header_height += new_fixed_header.height();
			}

			$(window).scrollTop($('.comment-block').offset().top - header_height -15);
		}
	};

	return {
		init : function(code){
			commentInit(code);
		},
		toggleSub : function(code){
			commentToggleSub(code);
		},
		showEdit : function(code, board_type){
			commentShowEdit(code, board_type);
		},
		showSubForm : function(code){
			commentShowSubForm(code);
		},
		showAtForm : function(code){
			commentShowAtForm(code);
		},
		edit : function(code){
			commentEdit(code);
		},
		editMap : function(code){
			commentEditMap(code);
		},
		cancelEdit : function (code){
			commentCancelEdit(code);
		},
		addSub : function(code){
			commentAddSub(code);
		},
		addMapSub : function(code){
			commentMapAddSub(code);
		},
		addAt : function(code){
			commentAddAt(code);
		},
		showSubEdit : function(code){
			commentShowSubEdit(code);
		},
		cancelSubEdit : function (code){
			commentCancelSubEdit(code);
		},
		subEdit : function(code){
			commentSubEdit(code);
		},
		confirmShow : function(e,code,type,interlock_type,use_interlock_board){
			commentConfirmShow(e,code,type,interlock_type,use_interlock_board);
		},
		mapConfirmShow : function(e, code, type, interlock_type){
			commentMapConfirmShow(e, code , type, interlock_type)
		},
		confirmMapDelete : function(e,code){
			commentConfirmMapDelete(e,code);
		},
		'delete' : function(code, pass,interlock_type,use_interlock_board){
			commentDelete(code,pass,interlock_type,use_interlock_board);
		},
		deleteMap : function(code,pass){
			commentMapDelete(code,pass);
		},
		add : function(){
			commentAdd();
		},
		mapAdd : function(){
			commentMapAdd();
		},
		removeCommentImg : function(obj){
			removeCommentImg(obj)
		},
		getCommentListByCurrentPagingNum : function(current_page, is_move_to_comment_list_top){
			getCommentListByCurrentPagingNum(current_page, is_move_to_comment_list_top);
		},
		refreshCaptcha : function(){
			refreshCaptcha();
		},
		refreshCaptchaSubForm: function(code) {
			refreshCaptcha('sub_form', code);
		}
	}

}();
