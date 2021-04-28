using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using BCParksApi.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using NSwag.Annotations;

namespace BCParksApi.Controllers
{
    [OpenApiTag("BC Parks API")]
    [Route("[controller]")]
    [Produces("application/json")]
    [ApiController]
    public class ApiController : ControllerBase
    {
        private readonly ILogger _logger;

        private IConfiguration _configuration;

        public ApiController(ILogger<ApiController> logger, IConfiguration configuration)
        {
            _configuration = configuration;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet]
        [Route("get/{route}/{param?}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetData(string route, string param = "")
        {
            try
            {
                string url = _configuration["CmsUrl"] + route;
                if (param != "")
                {
                    url += "?" + param;
                }
                url = url + "?token=" + _configuration["ApiToken"];
                string apiResponse = await ApiHelper.httpClient.GetStringAsync(url);
                return Ok(JsonConvert.DeserializeObject<object>(apiResponse));
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{0} ", e.Message);
                return NotFound();
            }
        }

        [HttpPost]
        [Route("add/{route}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SaveData([FromBody] Object obj, string route)
        {
            try
            {
                string url = _configuration["CmsUrl"] + route + "?token=" + _configuration["ApiToken"];
                HttpResponseMessage apiResponse = await ApiHelper.httpClient.PostAsync(url, new StringContent(JsonConvert.SerializeObject(obj), Encoding.UTF8, "application/json"));
                apiResponse.EnsureSuccessStatusCode();
                string responseBody = await apiResponse.Content.ReadAsStringAsync();
                return Ok(JsonConvert.DeserializeObject<object>(responseBody));
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{0} ", e.Message);
                return BadRequest();
            }
        }

        [HttpPut]
        [Route("update/{route}/{id?}")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateData([FromBody] Object obj, string route, string id = "")
        {
            try
            {
                string url = _configuration["CmsUrl"] + route;
                if (id != "")
                {
                    url += "/" + id;
                }
                url = url + "?token=" + _configuration["ApiToken"];
                HttpResponseMessage apiResponse = await ApiHelper.httpClient.PutAsync(url, new StringContent(JsonConvert.SerializeObject(obj), Encoding.UTF8, "application/json"));
                apiResponse.EnsureSuccessStatusCode();
                string responseBody = await apiResponse.Content.ReadAsStringAsync();
                return Ok(JsonConvert.DeserializeObject<object>(responseBody));
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{0} ", e.Message);
                return BadRequest();
            }
        }
    }
}
